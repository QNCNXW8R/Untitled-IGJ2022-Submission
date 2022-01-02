
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
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
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    // (64:8) {#each pipeline.getTimeUnits() as unit}
    function create_each_block_3(ctx) {
    	let div;
    	let t0_value = /*unit*/ ctx[27].name + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 64, 12, 2321);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = /*unit*/ ctx[27].name + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(64:8) {#each pipeline.getTimeUnits() as unit}",
    		ctx
    	});

    	return block;
    }

    // (72:8) {#each pipeline.getTimeUnits() as unit}
    function create_each_block_2(ctx) {
    	let div;
    	let t0_value = Math.floor(/*unit*/ ctx[27].value) + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 72, 12, 2546);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = Math.floor(/*unit*/ ctx[27].value) + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(72:8) {#each pipeline.getTimeUnits() as unit}",
    		ctx
    	});

    	return block;
    }

    // (80:8) {#each pipeline.timeUnitRelations as relation}
    function create_each_block_1(ctx) {
    	let div;
    	let t0_value = Math.floor(/*relation*/ ctx[22].currentPer) + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 80, 12, 2792);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = Math.floor(/*relation*/ ctx[22].currentPer) + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(80:8) {#each pipeline.timeUnitRelations as relation}",
    		ctx
    	});

    	return block;
    }

    // (88:8) {#each pipeline.timeUnitRelations as relation}
    function create_each_block(ctx) {
    	let div;
    	let t0_value = /*relation*/ ctx[22].getRatio().toPrecision(5) + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 88, 12, 3050);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = /*relation*/ ctx[22].getRatio().toPrecision(5) + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(88:8) {#each pipeline.timeUnitRelations as relation}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let h3;
    	let t3;
    	let label;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let button0;
    	let t7;
    	let button1;
    	let t9;
    	let div8;
    	let div1;
    	let div0;
    	let t11;
    	let t12;
    	let div3;
    	let div2;
    	let t14;
    	let t15;
    	let div5;
    	let div4;
    	let t17;
    	let t18;
    	let div7;
    	let div6;
    	let t20;
    	let t21;
    	let p0;
    	let t22;
    	let t23_value = Math.floor(/*points*/ ctx[2]) + "";
    	let t23;
    	let t24;
    	let p1;
    	let t25;
    	let t26_value = (1 + Math.log(/*points*/ ctx[2] + 1)).toPrecision(5) + "";
    	let t26;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*pipeline*/ ctx[1].getTimeUnits();
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*pipeline*/ ctx[1].getTimeUnits();
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*pipeline*/ ctx[1].timeUnitRelations;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*pipeline*/ ctx[1].timeUnitRelations;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Untitled Game";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "Dev Speed Multiplier:";
    			t3 = space();
    			label = element("label");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Start";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Stop";
    			t9 = space();
    			div8 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Units:";
    			t11 = space();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t12 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div2.textContent = "Amount:";
    			t14 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t15 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "Maximum:";
    			t17 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t18 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div6.textContent = "Multiplier:";
    			t20 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t21 = space();
    			p0 = element("p");
    			t22 = text("Points: ");
    			t23 = text(t23_value);
    			t24 = space();
    			p1 = element("p");
    			t25 = text("Points are speeding up time by a factor of: ");
    			t26 = text(t26_value);
    			attr_dev(h1, "class", "title");
    			add_location(h1, file, 51, 0, 1885);
    			add_location(h3, file, 52, 0, 1923);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			add_location(input0, file, 54, 1, 1965);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			add_location(input1, file, 55, 1, 2024);
    			add_location(label, file, 53, 0, 1955);
    			attr_dev(button0, "onclick", "start()");
    			add_location(button0, file, 57, 0, 2091);
    			attr_dev(button1, "onclick", "stop()");
    			add_location(button1, file, 58, 0, 2131);
    			attr_dev(div0, "class", "col-1");
    			add_location(div0, file, 62, 8, 2227);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file, 61, 4, 2200);
    			attr_dev(div2, "class", "col-1");
    			add_location(div2, file, 70, 8, 2451);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file, 69, 4, 2424);
    			attr_dev(div4, "class", "col-1");
    			add_location(div4, file, 78, 8, 2689);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file, 77, 4, 2662);
    			attr_dev(div6, "class", "col-1");
    			add_location(div6, file, 86, 8, 2944);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file, 85, 4, 2917);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file, 60, 0, 2171);
    			attr_dev(p0, "id", "pointsAmount");
    			add_location(p0, file, 95, 0, 3184);
    			add_location(p1, file, 96, 0, 3237);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, label, anchor);
    			append_dev(label, input0);
    			set_input_value(input0, /*speedMult*/ ctx[0]);
    			append_dev(label, t4);
    			append_dev(label, input1);
    			set_input_value(input1, /*speedMult*/ ctx[0]);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t11);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div1, null);
    			}

    			append_dev(div8, t12);
    			append_dev(div8, div3);
    			append_dev(div3, div2);
    			append_dev(div3, t14);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div3, null);
    			}

    			append_dev(div8, t15);
    			append_dev(div8, div5);
    			append_dev(div5, div4);
    			append_dev(div5, t17);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div5, null);
    			}

    			append_dev(div8, t18);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div7, t20);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div7, null);
    			}

    			insert_dev(target, t21, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t22);
    			append_dev(p0, t23);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t25);
    			append_dev(p1, t26);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*speedMult*/ 1 && to_number(input0.value) !== /*speedMult*/ ctx[0]) {
    				set_input_value(input0, /*speedMult*/ ctx[0]);
    			}

    			if (dirty[0] & /*speedMult*/ 1) {
    				set_input_value(input1, /*speedMult*/ ctx[0]);
    			}

    			if (dirty[0] & /*pipeline*/ 2) {
    				each_value_3 = /*pipeline*/ ctx[1].getTimeUnits();
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*pipeline*/ 2) {
    				each_value_2 = /*pipeline*/ ctx[1].getTimeUnits();
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*pipeline*/ 2) {
    				each_value_1 = /*pipeline*/ ctx[1].timeUnitRelations;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div5, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*pipeline*/ 2) {
    				each_value = /*pipeline*/ ctx[1].timeUnitRelations;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div7, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*points*/ 4 && t23_value !== (t23_value = Math.floor(/*points*/ ctx[2]) + "")) set_data_dev(t23, t23_value);
    			if (dirty[0] & /*points*/ 4 && t26_value !== (t26_value = (1 + Math.log(/*points*/ ctx[2] + 1)).toPrecision(5) + "")) set_data_dev(t26, t26_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div8);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(p1);
    			mounted = false;
    			run_all(dispose);
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
    	let speedMult = 1;
    	var seconds = new TimeUnit('Seconds');
    	var minutes = new TimeUnit('Minutes');
    	var hours = new TimeUnit('Hours');
    	var days = new TimeUnit('Days');
    	var years = new TimeUnit('Years');
    	var epochs = new TimeUnit('Epochs');
    	var eons = new TimeUnit('Eons');
    	var heatDeaths = new TimeUnit('Heat Deaths');
    	var secondsToMinutes = new TimeUnitRelation(seconds, minutes, 60, 60, 10);
    	var minutesToHours = new TimeUnitRelation(minutes, hours, 60, 60, 15);
    	var hoursToDays = new TimeUnitRelation(hours, days, 24, 24, 6);
    	var daysToYears = new TimeUnitRelation(days, years, 365, 365, 73);
    	var yearsToEpochs = new TimeUnitRelation(years, epochs, 10000, 10000, 1000);
    	var epochsToEons = new TimeUnitRelation(epochs, eons, 100000, 100000, 25000);
    	var eonsToHeatDeaths = new TimeUnitRelation(eons, heatDeaths, 1000000, 1000000, 1000000);

    	var pipeline = new TimeUnitPipeline([
    			secondsToMinutes,
    			minutesToHours,
    			hoursToDays,
    			daysToYears,
    			yearsToEpochs,
    			epochsToEons,
    			eonsToHeatDeaths
    		]);

    	var points = 0;
    	var intervalID = -1;

    	window.start = function () {
    		console.log("Starting...");
    		intervalID = setInterval(() => onTick(), 50);
    	};

    	window.stop = function () {
    		console.log("Stopping...");
    		clearInterval(intervalID);
    		intervalID = -1;
    	};

    	function onTick() {
    		let tickrate = (1 + Math.log(points + 1)) * pipeline.getRatio() * speedMult / 20;
    		$$invalidate(2, points += tickrate);
    		$$invalidate(1, pipeline.timeUnitRelations[0].fromUnit.value += tickrate, pipeline);
    		$$invalidate(1, pipeline.timeUnitRelations[0].fromUnit.total += tickrate, pipeline);
    		pipeline.convert();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		speedMult = to_number(this.value);
    		$$invalidate(0, speedMult);
    	}

    	function input1_change_input_handler() {
    		speedMult = to_number(this.value);
    		$$invalidate(0, speedMult);
    	}

    	$$self.$capture_state = () => ({
    		TimeUnit,
    		TimeUnitRelation,
    		TimeUnitPipeline,
    		speedMult,
    		seconds,
    		minutes,
    		hours,
    		days,
    		years,
    		epochs,
    		eons,
    		heatDeaths,
    		secondsToMinutes,
    		minutesToHours,
    		hoursToDays,
    		daysToYears,
    		yearsToEpochs,
    		epochsToEons,
    		eonsToHeatDeaths,
    		pipeline,
    		points,
    		intervalID,
    		onTick
    	});

    	$$self.$inject_state = $$props => {
    		if ('speedMult' in $$props) $$invalidate(0, speedMult = $$props.speedMult);
    		if ('seconds' in $$props) seconds = $$props.seconds;
    		if ('minutes' in $$props) minutes = $$props.minutes;
    		if ('hours' in $$props) hours = $$props.hours;
    		if ('days' in $$props) days = $$props.days;
    		if ('years' in $$props) years = $$props.years;
    		if ('epochs' in $$props) epochs = $$props.epochs;
    		if ('eons' in $$props) eons = $$props.eons;
    		if ('heatDeaths' in $$props) heatDeaths = $$props.heatDeaths;
    		if ('secondsToMinutes' in $$props) secondsToMinutes = $$props.secondsToMinutes;
    		if ('minutesToHours' in $$props) minutesToHours = $$props.minutesToHours;
    		if ('hoursToDays' in $$props) hoursToDays = $$props.hoursToDays;
    		if ('daysToYears' in $$props) daysToYears = $$props.daysToYears;
    		if ('yearsToEpochs' in $$props) yearsToEpochs = $$props.yearsToEpochs;
    		if ('epochsToEons' in $$props) epochsToEons = $$props.epochsToEons;
    		if ('eonsToHeatDeaths' in $$props) eonsToHeatDeaths = $$props.eonsToHeatDeaths;
    		if ('pipeline' in $$props) $$invalidate(1, pipeline = $$props.pipeline);
    		if ('points' in $$props) $$invalidate(2, points = $$props.points);
    		if ('intervalID' in $$props) intervalID = $$props.intervalID;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [speedMult, pipeline, points, input0_input_handler, input1_change_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

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
