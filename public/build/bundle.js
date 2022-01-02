
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.44.3 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let button;
    	let t1;
    	let h1;
    	let t3;
    	let table;
    	let thead;
    	let tr0;
    	let td0;
    	let t5;
    	let td1;

    	let t6_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    	? '???'
    	: 'Seconds') + "";

    	let t6;
    	let t7;
    	let td2;

    	let t8_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    	? '???'
    	: 'Minutes') + "";

    	let t8;
    	let t9;
    	let td3;

    	let t10_value = (/*resource_values*/ ctx[0]['hours'] < 1
    	? '???'
    	: 'Hours') + "";

    	let t10;
    	let t11;
    	let td4;
    	let t12_value = (/*resource_values*/ ctx[0]['days'] < 1 ? '???' : 'Days') + "";
    	let t12;
    	let t13;
    	let td5;

    	let t14_value = (/*resource_values*/ ctx[0]['years'] < 1
    	? '???'
    	: 'Years') + "";

    	let t14;
    	let t15;
    	let tbody;
    	let tr1;
    	let td6;
    	let t17;
    	let td7;

    	let t18_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[0]['seconds'])) + "";

    	let t18;
    	let t19;
    	let td8;

    	let t20_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[0]['minutes'])) + "";

    	let t20;
    	let t21;
    	let td9;

    	let t22_value = (/*resource_values*/ ctx[0]['hours'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[0]['hours'])) + "";

    	let t22;
    	let t23;
    	let td10;

    	let t24_value = (/*resource_values*/ ctx[0]['days'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[0]['days'])) + "";

    	let t24;
    	let t25;
    	let td11;

    	let t26_value = (/*resource_values*/ ctx[0]['years'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[0]['years'])) + "";

    	let t26;
    	let t27;
    	let tr2;
    	let td12;
    	let t29;
    	let td13;

    	let t30_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[1]['seconds'])) + "";

    	let t30;
    	let t31;
    	let td14;

    	let t32_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[1]['minutes'])) + "";

    	let t32;
    	let t33;
    	let td15;

    	let t34_value = (/*resource_values*/ ctx[0]['hours'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[1]['hours'])) + "";

    	let t34;
    	let t35;
    	let td16;

    	let t36_value = (/*resource_values*/ ctx[0]['days'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[1]['days'])) + "";

    	let t36;
    	let t37;
    	let td17;

    	let t38_value = (/*resource_values*/ ctx[0]['years'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[1]['years'])) + "";

    	let t38;
    	let t39;
    	let tr3;
    	let td18;
    	let t41;
    	let td19;

    	let t42_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[1]['seconds'] / Math.floor(/*resource_base_pers*/ ctx[3]['seconds'])).toPrecision(5)) + "";

    	let t42;
    	let t43;
    	let td20;

    	let t44_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[1]['minutes'] / Math.floor(/*resource_base_pers*/ ctx[3]['minutes'])).toPrecision(5)) + "";

    	let t44;
    	let t45;
    	let td21;

    	let t46_value = (/*resource_values*/ ctx[0]['hours'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[1]['hours'] / Math.floor(/*resource_base_pers*/ ctx[3]['hours'])).toPrecision(5)) + "";

    	let t46;
    	let t47;
    	let td22;

    	let t48_value = (/*resource_values*/ ctx[0]['days'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[1]['days'] / Math.floor(/*resource_base_pers*/ ctx[3]['days'])).toPrecision(5)) + "";

    	let t48;
    	let t49;
    	let td23;

    	let t50_value = (/*resource_values*/ ctx[0]['years'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[1]['years'] / Math.floor(/*resource_base_pers*/ ctx[3]['years'])).toPrecision(5)) + "";

    	let t50;
    	let t51;
    	let p0;
    	let t53;
    	let p1;
    	let t54;
    	let t55;
    	let p2;
    	let t57;
    	let p3;
    	let t58_value = (1 + Math.log(/*points*/ ctx[2] + 1)).toPrecision(5) + "";
    	let t58;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Go";
    			t1 = space();
    			h1 = element("h1");
    			h1.textContent = "Untitled Game";
    			t3 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "UNIT";
    			t5 = space();
    			td1 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td2 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td3 = element("td");
    			t10 = text(t10_value);
    			t11 = space();
    			td4 = element("td");
    			t12 = text(t12_value);
    			t13 = space();
    			td5 = element("td");
    			t14 = text(t14_value);
    			t15 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td6 = element("td");
    			td6.textContent = "AMOUNT";
    			t17 = space();
    			td7 = element("td");
    			t18 = text(t18_value);
    			t19 = space();
    			td8 = element("td");
    			t20 = text(t20_value);
    			t21 = space();
    			td9 = element("td");
    			t22 = text(t22_value);
    			t23 = space();
    			td10 = element("td");
    			t24 = text(t24_value);
    			t25 = space();
    			td11 = element("td");
    			t26 = text(t26_value);
    			t27 = space();
    			tr2 = element("tr");
    			td12 = element("td");
    			td12.textContent = "MAX";
    			t29 = space();
    			td13 = element("td");
    			t30 = text(t30_value);
    			t31 = space();
    			td14 = element("td");
    			t32 = text(t32_value);
    			t33 = space();
    			td15 = element("td");
    			t34 = text(t34_value);
    			t35 = space();
    			td16 = element("td");
    			t36 = text(t36_value);
    			t37 = space();
    			td17 = element("td");
    			t38 = text(t38_value);
    			t39 = space();
    			tr3 = element("tr");
    			td18 = element("td");
    			td18.textContent = "Squeezing that many of this unit into each of the next unit is speeding up time by a factor of:";
    			t41 = space();
    			td19 = element("td");
    			t42 = text(t42_value);
    			t43 = space();
    			td20 = element("td");
    			t44 = text(t44_value);
    			t45 = space();
    			td21 = element("td");
    			t46 = text(t46_value);
    			t47 = space();
    			td22 = element("td");
    			t48 = text(t48_value);
    			t49 = space();
    			td23 = element("td");
    			t50 = text(t50_value);
    			t51 = space();
    			p0 = element("p");
    			p0.textContent = "Points:";
    			t53 = space();
    			p1 = element("p");
    			t54 = text(/*points*/ ctx[2]);
    			t55 = space();
    			p2 = element("p");
    			p2.textContent = "Points are speeding up time by a factor of:";
    			t57 = space();
    			p3 = element("p");
    			t58 = text(t58_value);
    			attr_dev(button, "onclick", "start()");
    			add_location(button, file, 65, 0, 2370);
    			add_location(h1, file, 66, 0, 2407);
    			attr_dev(td0, "class", "svelte-1jjc0t3");
    			add_location(td0, file, 70, 12, 2479);
    			attr_dev(td1, "id", "secondsTitle");
    			attr_dev(td1, "class", "svelte-1jjc0t3");
    			add_location(td1, file, 71, 12, 2506);
    			attr_dev(td2, "id", "minutesTitle");
    			attr_dev(td2, "class", "svelte-1jjc0t3");
    			add_location(td2, file, 72, 12, 2597);
    			attr_dev(td3, "id", "hoursTitle");
    			attr_dev(td3, "class", "svelte-1jjc0t3");
    			add_location(td3, file, 73, 12, 2688);
    			attr_dev(td4, "id", "daysTitle");
    			attr_dev(td4, "class", "svelte-1jjc0t3");
    			add_location(td4, file, 74, 12, 2773);
    			attr_dev(td5, "id", "yearsTitle");
    			attr_dev(td5, "class", "svelte-1jjc0t3");
    			add_location(td5, file, 75, 12, 2855);
    			add_location(tr0, file, 69, 8, 2461);
    			add_location(thead, file, 68, 4, 2444);
    			attr_dev(td6, "class", "svelte-1jjc0t3");
    			add_location(td6, file, 80, 12, 2996);
    			attr_dev(td7, "id", "secondsAmount");
    			attr_dev(td7, "class", "svelte-1jjc0t3");
    			add_location(td7, file, 81, 12, 3025);
    			attr_dev(td8, "id", "minutesAmount");
    			attr_dev(td8, "class", "svelte-1jjc0t3");
    			add_location(td8, file, 82, 12, 3144);
    			attr_dev(td9, "id", "hoursAmount");
    			attr_dev(td9, "class", "svelte-1jjc0t3");
    			add_location(td9, file, 83, 12, 3263);
    			attr_dev(td10, "id", "daysAmount");
    			attr_dev(td10, "class", "svelte-1jjc0t3");
    			add_location(td10, file, 84, 12, 3376);
    			attr_dev(td11, "id", "yearsAmount");
    			attr_dev(td11, "class", "svelte-1jjc0t3");
    			add_location(td11, file, 85, 12, 3486);
    			add_location(tr1, file, 79, 8, 2978);
    			attr_dev(td12, "class", "svelte-1jjc0t3");
    			add_location(td12, file, 88, 12, 3628);
    			attr_dev(td13, "id", "secondsPer");
    			attr_dev(td13, "class", "svelte-1jjc0t3");
    			add_location(td13, file, 89, 12, 3654);
    			attr_dev(td14, "id", "minutesPer");
    			attr_dev(td14, "class", "svelte-1jjc0t3");
    			add_location(td14, file, 90, 12, 3768);
    			attr_dev(td15, "id", "hoursPer");
    			attr_dev(td15, "class", "svelte-1jjc0t3");
    			add_location(td15, file, 91, 12, 3882);
    			attr_dev(td16, "id", "daysPer");
    			attr_dev(td16, "class", "svelte-1jjc0t3");
    			add_location(td16, file, 92, 12, 3990);
    			attr_dev(td17, "id", "yearsPer");
    			attr_dev(td17, "class", "svelte-1jjc0t3");
    			add_location(td17, file, 93, 12, 4095);
    			add_location(tr2, file, 87, 8, 3610);
    			attr_dev(td18, "class", "svelte-1jjc0t3");
    			add_location(td18, file, 96, 12, 4232);
    			attr_dev(td19, "id", "secondsFactor");
    			attr_dev(td19, "class", "svelte-1jjc0t3");
    			add_location(td19, file, 97, 12, 4350);
    			attr_dev(td20, "id", "minutesFactor");
    			attr_dev(td20, "class", "svelte-1jjc0t3");
    			add_location(td20, file, 98, 12, 4516);
    			attr_dev(td21, "id", "hoursFactor");
    			attr_dev(td21, "class", "svelte-1jjc0t3");
    			add_location(td21, file, 99, 12, 4682);
    			attr_dev(td22, "id", "daysFactor");
    			attr_dev(td22, "class", "svelte-1jjc0t3");
    			add_location(td22, file, 100, 12, 4840);
    			attr_dev(td23, "id", "yearsFactor");
    			attr_dev(td23, "class", "svelte-1jjc0t3");
    			add_location(td23, file, 101, 12, 4994);
    			add_location(tr3, file, 95, 8, 4214);
    			add_location(tbody, file, 78, 4, 2961);
    			attr_dev(table, "class", "svelte-1jjc0t3");
    			add_location(table, file, 67, 0, 2431);
    			add_location(p0, file, 105, 0, 5179);
    			attr_dev(p1, "id", "pointsAmount");
    			add_location(p1, file, 106, 0, 5195);
    			add_location(p2, file, 107, 0, 5228);
    			attr_dev(p3, "id", "pointsFactor");
    			add_location(p3, file, 108, 0, 5280);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t5);
    			append_dev(tr0, td1);
    			append_dev(td1, t6);
    			append_dev(tr0, t7);
    			append_dev(tr0, td2);
    			append_dev(td2, t8);
    			append_dev(tr0, t9);
    			append_dev(tr0, td3);
    			append_dev(td3, t10);
    			append_dev(tr0, t11);
    			append_dev(tr0, td4);
    			append_dev(td4, t12);
    			append_dev(tr0, t13);
    			append_dev(tr0, td5);
    			append_dev(td5, t14);
    			append_dev(table, t15);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td6);
    			append_dev(tr1, t17);
    			append_dev(tr1, td7);
    			append_dev(td7, t18);
    			append_dev(tr1, t19);
    			append_dev(tr1, td8);
    			append_dev(td8, t20);
    			append_dev(tr1, t21);
    			append_dev(tr1, td9);
    			append_dev(td9, t22);
    			append_dev(tr1, t23);
    			append_dev(tr1, td10);
    			append_dev(td10, t24);
    			append_dev(tr1, t25);
    			append_dev(tr1, td11);
    			append_dev(td11, t26);
    			append_dev(tbody, t27);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td12);
    			append_dev(tr2, t29);
    			append_dev(tr2, td13);
    			append_dev(td13, t30);
    			append_dev(tr2, t31);
    			append_dev(tr2, td14);
    			append_dev(td14, t32);
    			append_dev(tr2, t33);
    			append_dev(tr2, td15);
    			append_dev(td15, t34);
    			append_dev(tr2, t35);
    			append_dev(tr2, td16);
    			append_dev(td16, t36);
    			append_dev(tr2, t37);
    			append_dev(tr2, td17);
    			append_dev(td17, t38);
    			append_dev(tbody, t39);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td18);
    			append_dev(tr3, t41);
    			append_dev(tr3, td19);
    			append_dev(td19, t42);
    			append_dev(tr3, t43);
    			append_dev(tr3, td20);
    			append_dev(td20, t44);
    			append_dev(tr3, t45);
    			append_dev(tr3, td21);
    			append_dev(td21, t46);
    			append_dev(tr3, t47);
    			append_dev(tr3, td22);
    			append_dev(td22, t48);
    			append_dev(tr3, t49);
    			append_dev(tr3, td23);
    			append_dev(td23, t50);
    			insert_dev(target, t51, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t53, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t54);
    			insert_dev(target, t55, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t57, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, t58);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*resource_values*/ 1 && t6_value !== (t6_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    			? '???'
    			: 'Seconds') + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*resource_values*/ 1 && t8_value !== (t8_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    			? '???'
    			: 'Minutes') + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*resource_values*/ 1 && t10_value !== (t10_value = (/*resource_values*/ ctx[0]['hours'] < 1
    			? '???'
    			: 'Hours') + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*resource_values*/ 1 && t12_value !== (t12_value = (/*resource_values*/ ctx[0]['days'] < 1 ? '???' : 'Days') + "")) set_data_dev(t12, t12_value);

    			if (dirty & /*resource_values*/ 1 && t14_value !== (t14_value = (/*resource_values*/ ctx[0]['years'] < 1
    			? '???'
    			: 'Years') + "")) set_data_dev(t14, t14_value);

    			if (dirty & /*resource_values*/ 1 && t18_value !== (t18_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[0]['seconds'])) + "")) set_data_dev(t18, t18_value);

    			if (dirty & /*resource_values*/ 1 && t20_value !== (t20_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[0]['minutes'])) + "")) set_data_dev(t20, t20_value);

    			if (dirty & /*resource_values*/ 1 && t22_value !== (t22_value = (/*resource_values*/ ctx[0]['hours'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[0]['hours'])) + "")) set_data_dev(t22, t22_value);

    			if (dirty & /*resource_values*/ 1 && t24_value !== (t24_value = (/*resource_values*/ ctx[0]['days'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[0]['days'])) + "")) set_data_dev(t24, t24_value);

    			if (dirty & /*resource_values*/ 1 && t26_value !== (t26_value = (/*resource_values*/ ctx[0]['years'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[0]['years'])) + "")) set_data_dev(t26, t26_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t30_value !== (t30_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[1]['seconds'])) + "")) set_data_dev(t30, t30_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t32_value !== (t32_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[1]['minutes'])) + "")) set_data_dev(t32, t32_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t34_value !== (t34_value = (/*resource_values*/ ctx[0]['hours'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[1]['hours'])) + "")) set_data_dev(t34, t34_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t36_value !== (t36_value = (/*resource_values*/ ctx[0]['days'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[1]['days'])) + "")) set_data_dev(t36, t36_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t38_value !== (t38_value = (/*resource_values*/ ctx[0]['years'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[1]['years'])) + "")) set_data_dev(t38, t38_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t42_value !== (t42_value = (/*resource_values*/ ctx[0]['seconds'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[1]['seconds'] / Math.floor(/*resource_base_pers*/ ctx[3]['seconds'])).toPrecision(5)) + "")) set_data_dev(t42, t42_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t44_value !== (t44_value = (/*resource_values*/ ctx[0]['minutes'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[1]['minutes'] / Math.floor(/*resource_base_pers*/ ctx[3]['minutes'])).toPrecision(5)) + "")) set_data_dev(t44, t44_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t46_value !== (t46_value = (/*resource_values*/ ctx[0]['hours'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[1]['hours'] / Math.floor(/*resource_base_pers*/ ctx[3]['hours'])).toPrecision(5)) + "")) set_data_dev(t46, t46_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t48_value !== (t48_value = (/*resource_values*/ ctx[0]['days'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[1]['days'] / Math.floor(/*resource_base_pers*/ ctx[3]['days'])).toPrecision(5)) + "")) set_data_dev(t48, t48_value);

    			if (dirty & /*resource_values, resource_pers*/ 3 && t50_value !== (t50_value = (/*resource_values*/ ctx[0]['years'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[1]['years'] / Math.floor(/*resource_base_pers*/ ctx[3]['years'])).toPrecision(5)) + "")) set_data_dev(t50, t50_value);

    			if (dirty & /*points*/ 4) set_data_dev(t54, /*points*/ ctx[2]);
    			if (dirty & /*points*/ 4 && t58_value !== (t58_value = (1 + Math.log(/*points*/ ctx[2] + 1)).toPrecision(5) + "")) set_data_dev(t58, t58_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(table);
    			if (detaching) detach_dev(t51);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t53);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t55);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t57);
    			if (detaching) detach_dev(p3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	var resource_names = ['seconds', 'minutes', 'hours', 'days', 'years'];

    	var resource_values = {
    		'seconds': 0,
    		'minutes': 0,
    		'hours': 0,
    		'days': 0,
    		'years': 0
    	};

    	var resource_pers = {
    		'seconds': 60,
    		'minutes': 60,
    		'hours': 24,
    		'days': 365,
    		'years': 10000
    	};

    	var resource_base_pers = {
    		'seconds': 60,
    		'minutes': 60,
    		'hours': 24,
    		'days': 365,
    		'years': 10000
    	};

    	var baseTicksPerEpoch = resource_base_pers['seconds'] * resource_base_pers['minutes'] * resource_base_pers['hours'] * resource_base_pers['days'] * resource_base_pers['years'];
    	var pointRate = 1;
    	var points = 0;

    	window.start = function () {
    		console.log("Starting...");
    		setInterval(() => onTick(), 50);
    	};

    	function getTicksPerEpoch() {
    		return 1 * resource_pers['seconds'] * resource_pers['minutes'] * resource_pers['hours'] * resource_pers['days'] * resource_pers['years'];
    	}

    	function onTick() {
    		var tickrate = (1 + Math.log(points + 1)) * getTicksPerEpoch() / baseTicksPerEpoch;
    		$$invalidate(2, points += tickrate);
    		$$invalidate(0, resource_values['seconds'] += tickrate, resource_values);
    		$$invalidate(0, resource_values['minutes'] += tickrate / resource_pers['seconds'], resource_values);
    		$$invalidate(0, resource_values['hours'] += tickrate / resource_pers['minutes'] / resource_pers['seconds'], resource_values);
    		$$invalidate(0, resource_values['days'] += tickrate / resource_pers['minutes'] / resource_pers['hours'] / resource_pers['seconds'], resource_values);
    		$$invalidate(0, resource_values['years'] += tickrate / resource_pers['minutes'] / resource_pers['hours'] / resource_pers['seconds'] / resource_pers['days'], resource_values);
    		$$invalidate(1, resource_pers['seconds'] = 60 + 10 * Math.floor(resource_values['minutes']), resource_pers);
    		$$invalidate(1, resource_pers['minutes'] = 60 + 15 * Math.floor(resource_values['hours']), resource_pers);
    		$$invalidate(1, resource_pers['hours'] = 24 + 12 * Math.floor(resource_values['days']), resource_pers);
    		$$invalidate(1, resource_pers['days'] = 365 + 365 * Math.floor(resource_values['years']), resource_pers);

    		for (var i in resource_names) {
    			var res = resource_names[i];

    			if (resource_values[res] >= 1) {
    				if (resource_values[res] >= resource_pers[res]) {
    					$$invalidate(0, resource_values[res] = resource_values[res] % resource_pers[res], resource_values);
    				}
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		resource_names,
    		resource_values,
    		resource_pers,
    		resource_base_pers,
    		baseTicksPerEpoch,
    		pointRate,
    		points,
    		getTicksPerEpoch,
    		onTick
    	});

    	$$self.$inject_state = $$props => {
    		if ('resource_names' in $$props) resource_names = $$props.resource_names;
    		if ('resource_values' in $$props) $$invalidate(0, resource_values = $$props.resource_values);
    		if ('resource_pers' in $$props) $$invalidate(1, resource_pers = $$props.resource_pers);
    		if ('resource_base_pers' in $$props) $$invalidate(3, resource_base_pers = $$props.resource_base_pers);
    		if ('baseTicksPerEpoch' in $$props) baseTicksPerEpoch = $$props.baseTicksPerEpoch;
    		if ('pointRate' in $$props) pointRate = $$props.pointRate;
    		if ('points' in $$props) $$invalidate(2, points = $$props.points);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [resource_values, resource_pers, points, resource_base_pers];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
