
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    class TimeUnit {
        constructor(name='', value=0, total=0, visible=function(){return true}, requirement=function(){return true}) {
            this.name = name;
            this.value = value;
            this.total = total;
            this.visible = visible;
            this.requirement = requirement;
        }
    }

    class TimeUnitRelation {
        constructor(fromUnit=TimeUnit(), toUnit=TimeUnit(), basePer=1, currentPer=1, increasePer=0) {
            this.fromUnit = fromUnit;
            this.toUnit = toUnit;
            this.basePer = basePer;
            this.currentPer = currentPer;
            this.increasePer = increasePer;
        }

        convert() {
            this.toUnit.value += Math.floor(this.fromUnit.value / this.currentPer);
            this.toUnit.total += Math.floor(this.fromUnit.value / this.currentPer);
            this.fromUnit.value %= this.currentPer;
            this.currentPer = this.basePer + this.increasePer * this.toUnit.value;
        }

        getRatio() {
            return this.currentPer / this.basePer
        }
    }

    class TimeUnitPipeline {
        constructor(timeUnitRelations=[]) {
            this.timeUnitRelations = timeUnitRelations;
        }

        convert() {
            for (let i in this.timeUnitRelations) {
                let relation = this.timeUnitRelations[i];
                if (relation.fromUnit.value < relation.currentPer) { break; }
                relation.convert();
            }
        }

        getTimeUnits() {
            let timeUnits = [];
            for (let i in this.timeUnitRelations) {
                let relation = this.timeUnitRelations[i];
                if (i == 0) { timeUnits.push(relation.fromUnit); }
                timeUnits.push(relation.toUnit);
            }
            return timeUnits
        }

        getRatio() {
            let ratio = 1;
            for (let i in this.timeUnitRelations) {
                let relation = this.timeUnitRelations[i];
                ratio *= relation.getRatio();
            }
            return ratio
        }
    }

    /* src\App.svelte generated by Svelte v3.44.3 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    // (140:8) {#each pipeline.getTimeUnits() as unit}
    function create_each_block_3(ctx) {
    	let td;
    	let t0_value = /*unit*/ ctx[21].name + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(td, "class", "svelte-1jjc0t3");
    			add_location(td, file, 140, 12, 6291);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, t0);
    			append_dev(td, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pipeline*/ 1 && t0_value !== (t0_value = /*unit*/ ctx[21].name + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(140:8) {#each pipeline.getTimeUnits() as unit}",
    		ctx
    	});

    	return block;
    }

    // (149:12) {#each pipeline.getTimeUnits() as unit}
    function create_each_block_2(ctx) {
    	let td;
    	let t0_value = /*unit*/ ctx[21].value + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(td, "class", "svelte-1jjc0t3");
    			add_location(td, file, 149, 12, 6498);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, t0);
    			append_dev(td, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pipeline*/ 1 && t0_value !== (t0_value = /*unit*/ ctx[21].value + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(149:12) {#each pipeline.getTimeUnits() as unit}",
    		ctx
    	});

    	return block;
    }

    // (157:12) {#each pipeline.timeUnitRelations as relation}
    function create_each_block_1(ctx) {
    	let td;
    	let t0_value = /*relation*/ ctx[16].currentPer + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(td, "class", "svelte-1jjc0t3");
    			add_location(td, file, 157, 12, 6698);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, t0);
    			append_dev(td, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pipeline*/ 1 && t0_value !== (t0_value = /*relation*/ ctx[16].currentPer + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(157:12) {#each pipeline.timeUnitRelations as relation}",
    		ctx
    	});

    	return block;
    }

    // (165:12) {#each pipeline.timeUnitRelations as relation}
    function create_each_block(ctx) {
    	let td;
    	let t0_value = /*relation*/ ctx[16].getRatio() + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(td, "class", "svelte-1jjc0t3");
    			add_location(td, file, 165, 12, 6972);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, t0);
    			append_dev(td, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pipeline*/ 1 && t0_value !== (t0_value = /*relation*/ ctx[16].getRatio() + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(165:12) {#each pipeline.timeUnitRelations as relation}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let button;
    	let t1;
    	let h1;
    	let t3;
    	let table0;
    	let thead0;
    	let tr0;
    	let td0;
    	let t5;
    	let td1;

    	let t6_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    	? '???'
    	: 'Seconds') + "";

    	let t6;
    	let t7;
    	let td2;

    	let t8_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    	? '???'
    	: 'Minutes') + "";

    	let t8;
    	let t9;
    	let td3;

    	let t10_value = (/*resource_values*/ ctx[1]['hours'] < 1
    	? '???'
    	: 'Hours') + "";

    	let t10;
    	let t11;
    	let td4;
    	let t12_value = (/*resource_values*/ ctx[1]['days'] < 1 ? '???' : 'Days') + "";
    	let t12;
    	let t13;
    	let td5;

    	let t14_value = (/*resource_values*/ ctx[1]['years'] < 1
    	? '???'
    	: 'Years') + "";

    	let t14;
    	let t15;
    	let tbody0;
    	let tr1;
    	let td6;
    	let t17;
    	let td7;

    	let t18_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[1]['seconds'])) + "";

    	let t18;
    	let t19;
    	let td8;

    	let t20_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[1]['minutes'])) + "";

    	let t20;
    	let t21;
    	let td9;

    	let t22_value = (/*resource_values*/ ctx[1]['hours'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[1]['hours'])) + "";

    	let t22;
    	let t23;
    	let td10;

    	let t24_value = (/*resource_values*/ ctx[1]['days'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[1]['days'])) + "";

    	let t24;
    	let t25;
    	let td11;

    	let t26_value = (/*resource_values*/ ctx[1]['years'] < 1
    	? '?'
    	: Math.floor(/*resource_values*/ ctx[1]['years'])) + "";

    	let t26;
    	let t27;
    	let tr2;
    	let td12;
    	let t29;
    	let td13;

    	let t30_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[2]['seconds'])) + "";

    	let t30;
    	let t31;
    	let td14;

    	let t32_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[2]['minutes'])) + "";

    	let t32;
    	let t33;
    	let td15;

    	let t34_value = (/*resource_values*/ ctx[1]['hours'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[2]['hours'])) + "";

    	let t34;
    	let t35;
    	let td16;

    	let t36_value = (/*resource_values*/ ctx[1]['days'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[2]['days'])) + "";

    	let t36;
    	let t37;
    	let td17;

    	let t38_value = (/*resource_values*/ ctx[1]['years'] < 1
    	? '?'
    	: Math.floor(/*resource_pers*/ ctx[2]['years'])) + "";

    	let t38;
    	let t39;
    	let tr3;
    	let td18;
    	let t41;
    	let td19;

    	let t42_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[2]['seconds'] / Math.floor(/*resource_base_pers*/ ctx[5]['seconds'])).toPrecision(5)) + "";

    	let t42;
    	let t43;
    	let td20;

    	let t44_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[2]['minutes'] / Math.floor(/*resource_base_pers*/ ctx[5]['minutes'])).toPrecision(5)) + "";

    	let t44;
    	let t45;
    	let td21;

    	let t46_value = (/*resource_values*/ ctx[1]['hours'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[2]['hours'] / Math.floor(/*resource_base_pers*/ ctx[5]['hours'])).toPrecision(5)) + "";

    	let t46;
    	let t47;
    	let td22;

    	let t48_value = (/*resource_values*/ ctx[1]['days'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[2]['days'] / Math.floor(/*resource_base_pers*/ ctx[5]['days'])).toPrecision(5)) + "";

    	let t48;
    	let t49;
    	let td23;

    	let t50_value = (/*resource_values*/ ctx[1]['years'] < 1
    	? '?'
    	: (/*resource_pers*/ ctx[2]['years'] / Math.floor(/*resource_base_pers*/ ctx[5]['years'])).toPrecision(5)) + "";

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
    	let t58_value = (1 + Math.log(/*points*/ ctx[3] + 1)).toPrecision(5) + "";
    	let t58;
    	let t59;
    	let table1;
    	let thead1;
    	let td24;
    	let t61;
    	let t62;
    	let tbody1;
    	let tr4;
    	let td25;
    	let t64;
    	let t65;
    	let tr5;
    	let td26;
    	let t67;
    	let t68;
    	let tr6;
    	let td27;
    	let t70;
    	let t71;
    	let p4;
    	let t73;
    	let p5;
    	let t74;
    	let t75;
    	let p6;
    	let t77;
    	let p7;
    	let t78_value = (1 + Math.log(/*points2*/ ctx[4] + 1)).toPrecision(5) + "";
    	let t78;
    	let each_value_3 = /*pipeline*/ ctx[0].getTimeUnits();
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*pipeline*/ ctx[0].getTimeUnits();
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*pipeline*/ ctx[0].timeUnitRelations;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*pipeline*/ ctx[0].timeUnitRelations;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Go";
    			t1 = space();
    			h1 = element("h1");
    			h1.textContent = "Untitled Game";
    			t3 = space();
    			table0 = element("table");
    			thead0 = element("thead");
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
    			tbody0 = element("tbody");
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
    			t54 = text(/*points*/ ctx[3]);
    			t55 = space();
    			p2 = element("p");
    			p2.textContent = "Points are speeding up time by a factor of:";
    			t57 = space();
    			p3 = element("p");
    			t58 = text(t58_value);
    			t59 = space();
    			table1 = element("table");
    			thead1 = element("thead");
    			td24 = element("td");
    			td24.textContent = "Units:";
    			t61 = space();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t62 = space();
    			tbody1 = element("tbody");
    			tr4 = element("tr");
    			td25 = element("td");
    			td25.textContent = "Amount:";
    			t64 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t65 = space();
    			tr5 = element("tr");
    			td26 = element("td");
    			td26.textContent = "Max:";
    			t67 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t68 = space();
    			tr6 = element("tr");
    			td27 = element("td");
    			td27.textContent = "Squeezing more of this unit into the next one is speeding up time by:";
    			t70 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t71 = space();
    			p4 = element("p");
    			p4.textContent = "Points:";
    			t73 = space();
    			p5 = element("p");
    			t74 = text(/*points2*/ ctx[4]);
    			t75 = space();
    			p6 = element("p");
    			p6.textContent = "Points are speeding up time by a factor of:";
    			t77 = space();
    			p7 = element("p");
    			t78 = text(t78_value);
    			attr_dev(button, "onclick", "start()");
    			add_location(button, file, 90, 0, 3203);
    			add_location(h1, file, 91, 0, 3240);
    			attr_dev(td0, "class", "svelte-1jjc0t3");
    			add_location(td0, file, 95, 12, 3312);
    			attr_dev(td1, "id", "secondsTitle");
    			attr_dev(td1, "class", "svelte-1jjc0t3");
    			add_location(td1, file, 96, 12, 3339);
    			attr_dev(td2, "id", "minutesTitle");
    			attr_dev(td2, "class", "svelte-1jjc0t3");
    			add_location(td2, file, 97, 12, 3430);
    			attr_dev(td3, "id", "hoursTitle");
    			attr_dev(td3, "class", "svelte-1jjc0t3");
    			add_location(td3, file, 98, 12, 3521);
    			attr_dev(td4, "id", "daysTitle");
    			attr_dev(td4, "class", "svelte-1jjc0t3");
    			add_location(td4, file, 99, 12, 3606);
    			attr_dev(td5, "id", "yearsTitle");
    			attr_dev(td5, "class", "svelte-1jjc0t3");
    			add_location(td5, file, 100, 12, 3688);
    			add_location(tr0, file, 94, 8, 3294);
    			add_location(thead0, file, 93, 4, 3277);
    			attr_dev(td6, "class", "svelte-1jjc0t3");
    			add_location(td6, file, 105, 12, 3829);
    			attr_dev(td7, "id", "secondsAmount");
    			attr_dev(td7, "class", "svelte-1jjc0t3");
    			add_location(td7, file, 106, 12, 3858);
    			attr_dev(td8, "id", "minutesAmount");
    			attr_dev(td8, "class", "svelte-1jjc0t3");
    			add_location(td8, file, 107, 12, 3977);
    			attr_dev(td9, "id", "hoursAmount");
    			attr_dev(td9, "class", "svelte-1jjc0t3");
    			add_location(td9, file, 108, 12, 4096);
    			attr_dev(td10, "id", "daysAmount");
    			attr_dev(td10, "class", "svelte-1jjc0t3");
    			add_location(td10, file, 109, 12, 4209);
    			attr_dev(td11, "id", "yearsAmount");
    			attr_dev(td11, "class", "svelte-1jjc0t3");
    			add_location(td11, file, 110, 12, 4319);
    			add_location(tr1, file, 104, 8, 3811);
    			attr_dev(td12, "class", "svelte-1jjc0t3");
    			add_location(td12, file, 113, 12, 4461);
    			attr_dev(td13, "id", "secondsPer");
    			attr_dev(td13, "class", "svelte-1jjc0t3");
    			add_location(td13, file, 114, 12, 4487);
    			attr_dev(td14, "id", "minutesPer");
    			attr_dev(td14, "class", "svelte-1jjc0t3");
    			add_location(td14, file, 115, 12, 4601);
    			attr_dev(td15, "id", "hoursPer");
    			attr_dev(td15, "class", "svelte-1jjc0t3");
    			add_location(td15, file, 116, 12, 4715);
    			attr_dev(td16, "id", "daysPer");
    			attr_dev(td16, "class", "svelte-1jjc0t3");
    			add_location(td16, file, 117, 12, 4823);
    			attr_dev(td17, "id", "yearsPer");
    			attr_dev(td17, "class", "svelte-1jjc0t3");
    			add_location(td17, file, 118, 12, 4928);
    			add_location(tr2, file, 112, 8, 4443);
    			attr_dev(td18, "class", "svelte-1jjc0t3");
    			add_location(td18, file, 121, 12, 5065);
    			attr_dev(td19, "id", "secondsFactor");
    			attr_dev(td19, "class", "svelte-1jjc0t3");
    			add_location(td19, file, 122, 12, 5183);
    			attr_dev(td20, "id", "minutesFactor");
    			attr_dev(td20, "class", "svelte-1jjc0t3");
    			add_location(td20, file, 123, 12, 5349);
    			attr_dev(td21, "id", "hoursFactor");
    			attr_dev(td21, "class", "svelte-1jjc0t3");
    			add_location(td21, file, 124, 12, 5515);
    			attr_dev(td22, "id", "daysFactor");
    			attr_dev(td22, "class", "svelte-1jjc0t3");
    			add_location(td22, file, 125, 12, 5673);
    			attr_dev(td23, "id", "yearsFactor");
    			attr_dev(td23, "class", "svelte-1jjc0t3");
    			add_location(td23, file, 126, 12, 5827);
    			add_location(tr3, file, 120, 8, 5047);
    			add_location(tbody0, file, 103, 4, 3794);
    			attr_dev(table0, "class", "svelte-1jjc0t3");
    			add_location(table0, file, 92, 0, 3264);
    			add_location(p0, file, 130, 0, 6012);
    			attr_dev(p1, "id", "pointsAmount");
    			add_location(p1, file, 131, 0, 6028);
    			add_location(p2, file, 132, 0, 6061);
    			attr_dev(p3, "id", "pointsFactor");
    			add_location(p3, file, 133, 0, 6113);
    			attr_dev(td24, "class", "svelte-1jjc0t3");
    			add_location(td24, file, 138, 8, 6213);
    			add_location(thead1, file, 137, 4, 6196);
    			attr_dev(td25, "class", "svelte-1jjc0t3");
    			add_location(td25, file, 147, 12, 6415);
    			add_location(tr4, file, 146, 8, 6397);
    			attr_dev(td26, "class", "svelte-1jjc0t3");
    			add_location(td26, file, 155, 12, 6611);
    			add_location(tr5, file, 154, 8, 6593);
    			attr_dev(td27, "class", "svelte-1jjc0t3");
    			add_location(td27, file, 163, 12, 6820);
    			add_location(tr6, file, 162, 8, 6802);
    			add_location(tbody1, file, 145, 4, 6380);
    			attr_dev(table1, "class", "svelte-1jjc0t3");
    			add_location(table1, file, 136, 0, 6183);
    			add_location(p4, file, 173, 0, 7094);
    			attr_dev(p5, "id", "pointsAmount");
    			add_location(p5, file, 174, 0, 7110);
    			add_location(p6, file, 175, 0, 7144);
    			attr_dev(p7, "id", "pointsFactor");
    			add_location(p7, file, 176, 0, 7196);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, table0, anchor);
    			append_dev(table0, thead0);
    			append_dev(thead0, tr0);
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
    			append_dev(table0, t15);
    			append_dev(table0, tbody0);
    			append_dev(tbody0, tr1);
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
    			append_dev(tbody0, t27);
    			append_dev(tbody0, tr2);
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
    			append_dev(tbody0, t39);
    			append_dev(tbody0, tr3);
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
    			insert_dev(target, t59, anchor);
    			insert_dev(target, table1, anchor);
    			append_dev(table1, thead1);
    			append_dev(thead1, td24);
    			append_dev(thead1, t61);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(thead1, null);
    			}

    			append_dev(table1, t62);
    			append_dev(table1, tbody1);
    			append_dev(tbody1, tr4);
    			append_dev(tr4, td25);
    			append_dev(tr4, t64);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(tr4, null);
    			}

    			append_dev(tbody1, t65);
    			append_dev(tbody1, tr5);
    			append_dev(tr5, td26);
    			append_dev(tr5, t67);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(tr5, null);
    			}

    			append_dev(tbody1, t68);
    			append_dev(tbody1, tr6);
    			append_dev(tr6, td27);
    			append_dev(tr6, t70);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr6, null);
    			}

    			insert_dev(target, t71, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t73, anchor);
    			insert_dev(target, p5, anchor);
    			append_dev(p5, t74);
    			insert_dev(target, t75, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t77, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, t78);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*resource_values*/ 2 && t6_value !== (t6_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    			? '???'
    			: 'Seconds') + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*resource_values*/ 2 && t8_value !== (t8_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    			? '???'
    			: 'Minutes') + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*resource_values*/ 2 && t10_value !== (t10_value = (/*resource_values*/ ctx[1]['hours'] < 1
    			? '???'
    			: 'Hours') + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*resource_values*/ 2 && t12_value !== (t12_value = (/*resource_values*/ ctx[1]['days'] < 1 ? '???' : 'Days') + "")) set_data_dev(t12, t12_value);

    			if (dirty & /*resource_values*/ 2 && t14_value !== (t14_value = (/*resource_values*/ ctx[1]['years'] < 1
    			? '???'
    			: 'Years') + "")) set_data_dev(t14, t14_value);

    			if (dirty & /*resource_values*/ 2 && t18_value !== (t18_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[1]['seconds'])) + "")) set_data_dev(t18, t18_value);

    			if (dirty & /*resource_values*/ 2 && t20_value !== (t20_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[1]['minutes'])) + "")) set_data_dev(t20, t20_value);

    			if (dirty & /*resource_values*/ 2 && t22_value !== (t22_value = (/*resource_values*/ ctx[1]['hours'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[1]['hours'])) + "")) set_data_dev(t22, t22_value);

    			if (dirty & /*resource_values*/ 2 && t24_value !== (t24_value = (/*resource_values*/ ctx[1]['days'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[1]['days'])) + "")) set_data_dev(t24, t24_value);

    			if (dirty & /*resource_values*/ 2 && t26_value !== (t26_value = (/*resource_values*/ ctx[1]['years'] < 1
    			? '?'
    			: Math.floor(/*resource_values*/ ctx[1]['years'])) + "")) set_data_dev(t26, t26_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t30_value !== (t30_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[2]['seconds'])) + "")) set_data_dev(t30, t30_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t32_value !== (t32_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[2]['minutes'])) + "")) set_data_dev(t32, t32_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t34_value !== (t34_value = (/*resource_values*/ ctx[1]['hours'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[2]['hours'])) + "")) set_data_dev(t34, t34_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t36_value !== (t36_value = (/*resource_values*/ ctx[1]['days'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[2]['days'])) + "")) set_data_dev(t36, t36_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t38_value !== (t38_value = (/*resource_values*/ ctx[1]['years'] < 1
    			? '?'
    			: Math.floor(/*resource_pers*/ ctx[2]['years'])) + "")) set_data_dev(t38, t38_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t42_value !== (t42_value = (/*resource_values*/ ctx[1]['seconds'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[2]['seconds'] / Math.floor(/*resource_base_pers*/ ctx[5]['seconds'])).toPrecision(5)) + "")) set_data_dev(t42, t42_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t44_value !== (t44_value = (/*resource_values*/ ctx[1]['minutes'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[2]['minutes'] / Math.floor(/*resource_base_pers*/ ctx[5]['minutes'])).toPrecision(5)) + "")) set_data_dev(t44, t44_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t46_value !== (t46_value = (/*resource_values*/ ctx[1]['hours'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[2]['hours'] / Math.floor(/*resource_base_pers*/ ctx[5]['hours'])).toPrecision(5)) + "")) set_data_dev(t46, t46_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t48_value !== (t48_value = (/*resource_values*/ ctx[1]['days'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[2]['days'] / Math.floor(/*resource_base_pers*/ ctx[5]['days'])).toPrecision(5)) + "")) set_data_dev(t48, t48_value);

    			if (dirty & /*resource_values, resource_pers*/ 6 && t50_value !== (t50_value = (/*resource_values*/ ctx[1]['years'] < 1
    			? '?'
    			: (/*resource_pers*/ ctx[2]['years'] / Math.floor(/*resource_base_pers*/ ctx[5]['years'])).toPrecision(5)) + "")) set_data_dev(t50, t50_value);

    			if (dirty & /*points*/ 8) set_data_dev(t54, /*points*/ ctx[3]);
    			if (dirty & /*points*/ 8 && t58_value !== (t58_value = (1 + Math.log(/*points*/ ctx[3] + 1)).toPrecision(5) + "")) set_data_dev(t58, t58_value);

    			if (dirty & /*pipeline*/ 1) {
    				each_value_3 = /*pipeline*/ ctx[0].getTimeUnits();
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(thead1, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty & /*pipeline*/ 1) {
    				each_value_2 = /*pipeline*/ ctx[0].getTimeUnits();
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(tr4, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*pipeline*/ 1) {
    				each_value_1 = /*pipeline*/ ctx[0].timeUnitRelations;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tr5, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*pipeline*/ 1) {
    				each_value = /*pipeline*/ ctx[0].timeUnitRelations;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr6, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*points2*/ 16) set_data_dev(t74, /*points2*/ ctx[4]);
    			if (dirty & /*points2*/ 16 && t78_value !== (t78_value = (1 + Math.log(/*points2*/ ctx[4] + 1)).toPrecision(5) + "")) set_data_dev(t78, t78_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(table0);
    			if (detaching) detach_dev(t51);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t53);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t55);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t57);
    			if (detaching) detach_dev(p3);
    			if (detaching) detach_dev(t59);
    			if (detaching) detach_dev(table1);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t71);
    			if (detaching) detach_dev(p4);
    			if (detaching) detach_dev(t73);
    			if (detaching) detach_dev(p5);
    			if (detaching) detach_dev(t75);
    			if (detaching) detach_dev(p6);
    			if (detaching) detach_dev(t77);
    			if (detaching) detach_dev(p7);
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
    	var seconds = new TimeUnit('Seconds');
    	var minutes = new TimeUnit('Minutes');
    	var hours = new TimeUnit('Hours');
    	var secondsToMinutes = new TimeUnitRelation(seconds, minutes, 60, 60, 10);
    	var minutesToHours = new TimeUnitRelation(minutes, hours, 60, 60, 15);
    	var pipeline = new TimeUnitPipeline([secondsToMinutes, minutesToHours]);
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
    	var points2 = 0;

    	window.start = function () {
    		console.log("Starting...");
    		setInterval(() => onTick(), 50);
    	};

    	function getTicksPerEpoch() {
    		return 1 * resource_pers['seconds'] * resource_pers['minutes'] * resource_pers['hours'] * resource_pers['days'] * resource_pers['years'];
    	}

    	function onTick() {
    		var tickrate = (1 + Math.log(points + 1)) * getTicksPerEpoch() / baseTicksPerEpoch;
    		let tickrate2 = (1 + Math.log(points2 + 1)) * pipeline.getRatio();
    		$$invalidate(3, points += tickrate);
    		$$invalidate(4, points2 += tickrate2);
    		$$invalidate(0, pipeline.timeUnitRelations[0].fromUnit.value += tickrate, pipeline);
    		$$invalidate(0, pipeline.timeUnitRelations[0].fromUnit.total += tickrate, pipeline);
    		pipeline.convert();
    		$$invalidate(1, resource_values['seconds'] += tickrate, resource_values);
    		$$invalidate(1, resource_values['minutes'] += tickrate / resource_pers['seconds'], resource_values);
    		$$invalidate(1, resource_values['hours'] += tickrate / resource_pers['minutes'] / resource_pers['seconds'], resource_values);
    		$$invalidate(1, resource_values['days'] += tickrate / resource_pers['minutes'] / resource_pers['hours'] / resource_pers['seconds'], resource_values);
    		$$invalidate(1, resource_values['years'] += tickrate / resource_pers['minutes'] / resource_pers['hours'] / resource_pers['seconds'] / resource_pers['days'], resource_values);
    		$$invalidate(2, resource_pers['seconds'] = 60 + 10 * Math.floor(resource_values['minutes']), resource_pers);
    		$$invalidate(2, resource_pers['minutes'] = 60 + 15 * Math.floor(resource_values['hours']), resource_pers);
    		$$invalidate(2, resource_pers['hours'] = 24 + 12 * Math.floor(resource_values['days']), resource_pers);
    		$$invalidate(2, resource_pers['days'] = 365 + 365 * Math.floor(resource_values['years']), resource_pers);

    		for (var i in resource_names) {
    			var res = resource_names[i];

    			if (resource_values[res] >= 1) {
    				if (resource_values[res] >= resource_pers[res]) {
    					$$invalidate(1, resource_values[res] = resource_values[res] % resource_pers[res], resource_values);
    				}
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		TimeUnit,
    		TimeUnitRelation,
    		TimeUnitPipeline,
    		seconds,
    		minutes,
    		hours,
    		secondsToMinutes,
    		minutesToHours,
    		pipeline,
    		resource_names,
    		resource_values,
    		resource_pers,
    		resource_base_pers,
    		baseTicksPerEpoch,
    		pointRate,
    		points,
    		points2,
    		getTicksPerEpoch,
    		onTick
    	});

    	$$self.$inject_state = $$props => {
    		if ('seconds' in $$props) seconds = $$props.seconds;
    		if ('minutes' in $$props) minutes = $$props.minutes;
    		if ('hours' in $$props) hours = $$props.hours;
    		if ('secondsToMinutes' in $$props) secondsToMinutes = $$props.secondsToMinutes;
    		if ('minutesToHours' in $$props) minutesToHours = $$props.minutesToHours;
    		if ('pipeline' in $$props) $$invalidate(0, pipeline = $$props.pipeline);
    		if ('resource_names' in $$props) resource_names = $$props.resource_names;
    		if ('resource_values' in $$props) $$invalidate(1, resource_values = $$props.resource_values);
    		if ('resource_pers' in $$props) $$invalidate(2, resource_pers = $$props.resource_pers);
    		if ('resource_base_pers' in $$props) $$invalidate(5, resource_base_pers = $$props.resource_base_pers);
    		if ('baseTicksPerEpoch' in $$props) baseTicksPerEpoch = $$props.baseTicksPerEpoch;
    		if ('pointRate' in $$props) pointRate = $$props.pointRate;
    		if ('points' in $$props) $$invalidate(3, points = $$props.points);
    		if ('points2' in $$props) $$invalidate(4, points2 = $$props.points2);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pipeline, resource_values, resource_pers, points, points2, resource_base_pers];
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
    	// props: {
    	// 	name: 'world'
    	// }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
