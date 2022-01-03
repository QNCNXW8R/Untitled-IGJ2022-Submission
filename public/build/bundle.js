
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
    function empty() {
        return text('');
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

    class Multiplier {
        constructor(base = 1, factor = 1, dynamicBaseFunctions = [], dynamicFactorFunctions = []) {
            this.base = base;
            this.factor = factor;
            this.dynamicBaseFunctions = dynamicBaseFunctions;
            this.dynamicFactorFunctions = dynamicFactorFunctions;
        }
        addBase(x) {
            this.base += x;
        }
        multiplyFactor(x) {
            this.factor *= x;
        }
        addBaseFunction(f) {
            this.dynamicBaseFunctions.push(f);
        }
        addFactorFunction(f) {
            this.dynamicFactorFunctions.push(f);
        }
        calculate() {
            let x = 0;
            x += this.base;
            for (let i in this.dynamicBaseFunctions) {
                x += this.dynamicBaseFunctions[i]();
            }
            x *= this.factor;
            for (let i in this.dynamicFactorFunctions) {
                x *= this.dynamicFactorFunctions[i]();
            }
            return x;
        }
    }

    class TimeUnit {
        constructor(name = '', value = 0, total = 0, visible = function () { return true; }, requirement = function () { return true; }, multiplier = new Multiplier(), exponent = new Multiplier()) {
            this.name = name;
            this.value = value;
            this.total = total;
            this.visible = visible;
            this.requirement = requirement;
            this.multiplier = multiplier;
            this.exponent = exponent;
        }
    }

    class TimeUnitRelation {
        constructor(fromUnit = new TimeUnit(), toUnit = new TimeUnit(), basePer = 1, currentPer = 1, increasePer = 0, multiplier = new Multiplier(), exponent = new Multiplier()) {
            this.fromUnit = fromUnit;
            this.toUnit = toUnit;
            this.basePer = basePer;
            this.currentPer = currentPer;
            this.increasePer = increasePer;
            this.multiplier = multiplier;
            this.exponent = exponent;
        }
        convert() {
            let increase = Math.floor(Math.pow(this.fromUnit.value / this.currentPer * this.toUnit.multiplier.calculate(), this.toUnit.exponent.calculate()));
            this.toUnit.value += increase;
            this.toUnit.total += increase;
            this.fromUnit.value %= this.currentPer;
            this.currentPer += Math.pow(increase * this.increasePer * this.multiplier.calculate(), this.exponent.calculate());
        }
        getRatio() {
            return this.currentPer / this.basePer;
        }
    }

    class TimeUnitPipeline {
        constructor(timeUnitRelations = []) {
            this.timeUnitRelations = timeUnitRelations;
        }
        convert() {
            for (let i in this.timeUnitRelations) {
                let relation = this.timeUnitRelations[i];
                if (relation.fromUnit.value < relation.currentPer) {
                    break;
                }
                relation.convert();
            }
        }
        getTimeUnits() {
            let timeUnits = [];
            for (let i in this.timeUnitRelations) {
                let relation = this.timeUnitRelations[i];
                if (i == '0') {
                    timeUnits.push(relation.fromUnit);
                }
                timeUnits.push(relation.toUnit);
            }
            return timeUnits;
        }
        getRatio() {
            let ratio = 1;
            for (let i in this.timeUnitRelations) {
                let relation = this.timeUnitRelations[i];
                ratio *= relation.getRatio();
            }
            return ratio;
        }
    }

    class Upgrade {
        constructor(name = '', visible = function () { return true; }, costUnit = new TimeUnit(), cost = 0, upgradeTarget = function () { new Multiplier().multiplyFactor(1); }) {
            this.name = name;
            this.visible = visible;
            this.costUnit = costUnit;
            this.cost = cost;
            this.upgradeTarget = upgradeTarget;
        }
        purchase() {
            if (this.visible() && this.costUnit.value >= this.cost) {
                this.costUnit.value -= this.cost;
                this.visible = function () { return false; };
                this.upgradeTarget();
                return true;
            }
            return false;
        }
    }

    /* src\App.svelte generated by Svelte v3.44.3 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	return child_ctx;
    }

    // (83:16) {#if unit.visible()}
    function create_if_block_4(ctx) {
    	let div;

    	let t0_value = (/*unit*/ ctx[35].requirement()
    	? /*unit*/ ctx[35].name
    	: '???') + "";

    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 83, 20, 5160);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = (/*unit*/ ctx[35].requirement()
    			? /*unit*/ ctx[35].name
    			: '???') + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(83:16) {#if unit.visible()}",
    		ctx
    	});

    	return block;
    }

    // (82:12) {#each pipeline.getTimeUnits() as unit}
    function create_each_block_4(ctx) {
    	let show_if = /*unit*/ ctx[35].visible();
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2) show_if = /*unit*/ ctx[35].visible();

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(82:12) {#each pipeline.getTimeUnits() as unit}",
    		ctx
    	});

    	return block;
    }

    // (93:16) {#if unit.visible()}
    function create_if_block_3(ctx) {
    	let div;

    	let t0_value = (/*unit*/ ctx[35].requirement()
    	? Math.floor(/*unit*/ ctx[35].value)
    	: '?') + "";

    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 93, 20, 5519);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = (/*unit*/ ctx[35].requirement()
    			? Math.floor(/*unit*/ ctx[35].value)
    			: '?') + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(93:16) {#if unit.visible()}",
    		ctx
    	});

    	return block;
    }

    // (92:12) {#each pipeline.getTimeUnits() as unit}
    function create_each_block_3(ctx) {
    	let show_if = /*unit*/ ctx[35].visible();
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2) show_if = /*unit*/ ctx[35].visible();

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(92:12) {#each pipeline.getTimeUnits() as unit}",
    		ctx
    	});

    	return block;
    }

    // (103:16) {#if relation.fromUnit.visible()}
    function create_if_block_2(ctx) {
    	let div;

    	let t0_value = (/*relation*/ ctx[30].fromUnit.requirement()
    	? Math.floor(/*relation*/ ctx[30].currentPer)
    	: '?') + "";

    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 103, 20, 5910);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = (/*relation*/ ctx[30].fromUnit.requirement()
    			? Math.floor(/*relation*/ ctx[30].currentPer)
    			: '?') + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(103:16) {#if relation.fromUnit.visible()}",
    		ctx
    	});

    	return block;
    }

    // (102:12) {#each pipeline.timeUnitRelations as relation}
    function create_each_block_2(ctx) {
    	let show_if = /*relation*/ ctx[30].fromUnit.visible();
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2) show_if = /*relation*/ ctx[30].fromUnit.visible();

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(102:12) {#each pipeline.timeUnitRelations as relation}",
    		ctx
    	});

    	return block;
    }

    // (113:12) {#if relation.fromUnit.visible()}
    function create_if_block_1(ctx) {
    	let div;

    	let t0_value = (/*relation*/ ctx[30].fromUnit.requirement()
    	? /*relation*/ ctx[30].getRatio().toPrecision(5)
    	: '?') + "";

    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "col-1");
    			add_location(div, file, 113, 20, 6322);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2 && t0_value !== (t0_value = (/*relation*/ ctx[30].fromUnit.requirement()
    			? /*relation*/ ctx[30].getRatio().toPrecision(5)
    			: '?') + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(113:12) {#if relation.fromUnit.visible()}",
    		ctx
    	});

    	return block;
    }

    // (112:12) {#each pipeline.timeUnitRelations as relation}
    function create_each_block_1(ctx) {
    	let show_if = /*relation*/ ctx[30].fromUnit.visible();
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pipeline*/ 2) show_if = /*relation*/ ctx[30].fromUnit.visible();

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(112:12) {#each pipeline.timeUnitRelations as relation}",
    		ctx
    	});

    	return block;
    }

    // (127:12) {#if upgrade.visible()}
    function create_if_block(ctx) {
    	let div;
    	let t0_value = /*upgrade*/ ctx[27].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*upgrade*/ ctx[27].cost + "";
    	let t2;
    	let t3;
    	let t4_value = /*upgrade*/ ctx[27].costUnit.name + "";
    	let t4;
    	let t5;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*upgrade*/ ctx[27]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			add_location(div, file, 127, 16, 6823);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, t4);
    			append_dev(div, t5);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*upgrades*/ 4 && t0_value !== (t0_value = /*upgrade*/ ctx[27].name + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*upgrades*/ 4 && t2_value !== (t2_value = /*upgrade*/ ctx[27].cost + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*upgrades*/ 4 && t4_value !== (t4_value = /*upgrade*/ ctx[27].costUnit.name + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(127:12) {#if upgrade.visible()}",
    		ctx
    	});

    	return block;
    }

    // (126:8) {#each upgrades as upgrade}
    function create_each_block(ctx) {
    	let show_if = /*upgrade*/ ctx[27].visible();
    	let if_block_anchor;
    	let if_block = show_if && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*upgrades*/ 4) show_if = /*upgrade*/ ctx[27].visible();

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(126:8) {#each upgrades as upgrade}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div10;
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
    	let t23_value = Math.floor(/*points*/ ctx[3]) + "";
    	let t23;
    	let t24;
    	let p1;
    	let t25;
    	let t26_value = (1 + Math.log(/*points*/ ctx[3] + 1)).toPrecision(5) + "";
    	let t26;
    	let t27;
    	let div9;
    	let mounted;
    	let dispose;
    	let each_value_4 = /*pipeline*/ ctx[1].getTimeUnits();
    	validate_each_argument(each_value_4);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*pipeline*/ ctx[1].getTimeUnits();
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*pipeline*/ ctx[1].timeUnitRelations;
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

    	let each_value = /*upgrades*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div10 = element("div");
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

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t12 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div2.textContent = "Amount:";
    			t14 = space();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t15 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "Maximum:";
    			t17 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t18 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div6.textContent = "Multiplier:";
    			t20 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t21 = space();
    			p0 = element("p");
    			t22 = text("Points: ");
    			t23 = text(t23_value);
    			t24 = space();
    			p1 = element("p");
    			t25 = text("Points are speeding up time by a factor of: ");
    			t26 = text(t26_value);
    			t27 = space();
    			div9 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "title");
    			add_location(h1, file, 69, 4, 4626);
    			add_location(h3, file, 70, 4, 4668);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			add_location(input0, file, 72, 8, 4721);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			add_location(input1, file, 73, 8, 4787);
    			add_location(label, file, 71, 4, 4704);
    			add_location(button0, file, 75, 4, 4862);
    			add_location(button1, file, 76, 4, 4907);
    			attr_dev(div0, "class", "col-1");
    			add_location(div0, file, 80, 12, 5016);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file, 79, 8, 4985);
    			attr_dev(div2, "class", "col-1");
    			add_location(div2, file, 90, 12, 5374);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file, 89, 8, 5343);
    			attr_dev(div4, "class", "col-1");
    			add_location(div4, file, 100, 12, 5744);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file, 99, 8, 5713);
    			attr_dev(div6, "class", "col-1");
    			add_location(div6, file, 110, 12, 6157);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file, 109, 8, 6126);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file, 78, 4, 4952);
    			attr_dev(p0, "id", "pointsAmount");
    			add_location(p0, file, 121, 4, 6551);
    			add_location(p1, file, 122, 4, 6608);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file, 124, 4, 6708);
    			attr_dev(div10, "class", "container content");
    			add_location(div10, file, 68, 0, 4589);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, h1);
    			append_dev(div10, t1);
    			append_dev(div10, h3);
    			append_dev(div10, t3);
    			append_dev(div10, label);
    			append_dev(label, input0);
    			set_input_value(input0, /*speedMult*/ ctx[0]);
    			append_dev(label, t4);
    			append_dev(label, input1);
    			set_input_value(input1, /*speedMult*/ ctx[0]);
    			append_dev(div10, t5);
    			append_dev(div10, button0);
    			append_dev(div10, t7);
    			append_dev(div10, button1);
    			append_dev(div10, t9);
    			append_dev(div10, div8);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t11);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(div1, null);
    			}

    			append_dev(div8, t12);
    			append_dev(div8, div3);
    			append_dev(div3, div2);
    			append_dev(div3, t14);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div3, null);
    			}

    			append_dev(div8, t15);
    			append_dev(div8, div5);
    			append_dev(div5, div4);
    			append_dev(div5, t17);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div5, null);
    			}

    			append_dev(div8, t18);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div7, t20);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div7, null);
    			}

    			append_dev(div10, t21);
    			append_dev(div10, p0);
    			append_dev(p0, t22);
    			append_dev(p0, t23);
    			append_dev(div10, t24);
    			append_dev(div10, p1);
    			append_dev(p1, t25);
    			append_dev(p1, t26);
    			append_dev(div10, t27);
    			append_dev(div10, div9);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div9, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[8]),
    					listen_dev(button0, "click", /*start*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*stop*/ ctx[5], false, false, false)
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
    				each_value_4 = /*pipeline*/ ctx[1].getTimeUnits();
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_4.length;
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
    						each_blocks_3[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*pipeline*/ 2) {
    				each_value_2 = /*pipeline*/ ctx[1].timeUnitRelations;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div5, null);
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
    						each_blocks_1[i].m(div7, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*points*/ 8 && t23_value !== (t23_value = Math.floor(/*points*/ ctx[3]) + "")) set_data_dev(t23, t23_value);
    			if (dirty[0] & /*points*/ 8 && t26_value !== (t26_value = (1 + Math.log(/*points*/ ctx[3] + 1)).toPrecision(5) + "")) set_data_dev(t26, t26_value);

    			if (dirty[0] & /*attemptPurchase, upgrades*/ 68) {
    				each_value = /*upgrades*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div9, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
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

    	var minutes = new TimeUnit('Minutes',
    	0,
    	0,
    	function () {
    			return seconds.total >= 30;
    		},
    	function () {
    			return seconds.total >= 60;
    		}); // Require upgrade here in future

    	var hours = new TimeUnit('Hours',
    	0,
    	0,
    	function () {
    			return minutes.total >= 30;
    		},
    	function () {
    			return minutes.total >= 60;
    		});

    	var days = new TimeUnit('Days',
    	0,
    	0,
    	function () {
    			return hours.total >= 12;
    		},
    	function () {
    			return hours.total >= 24;
    		});

    	var years = new TimeUnit('Years',
    	0,
    	0,
    	function () {
    			return days.total >= 90;
    		},
    	function () {
    			return days.total >= 365;
    		});

    	var epochs = new TimeUnit('Epochs',
    	0,
    	0,
    	function () {
    			return years.total >= 1000;
    		},
    	function () {
    			return years.total >= 10000;
    		});

    	var eons = new TimeUnit('Eons',
    	0,
    	0,
    	function () {
    			return epochs.total >= 1000;
    		},
    	function () {
    			return epochs.total >= 100000;
    		});

    	var heatDeaths = new TimeUnit('Heat Deaths',
    	0,
    	0,
    	function () {
    			return eons.total >= 1000;
    		},
    	function () {
    			return eons.total >= 1000000;
    		});

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

    	var upgrades = [
    		//  Upgrade(name, visibilityFunction, costUnit, cost, upgradeTarget)
    		new Upgrade('Increase Seconds base by 100%',
    		function () {
    				return seconds.total >= 5;
    			},
    		seconds,
    		10,
    		function () {
    				seconds.multiplier.addBase(1);
    			}),
    		new Upgrade('Increase Seconds base by 100% again',
    		function () {
    				return seconds.total >= 20;
    			},
    		seconds,
    		30,
    		function () {
    				seconds.multiplier.addBase(1);
    			}),
    		new Upgrade('Increase Seconds base by another 100%',
    		function () {
    				return seconds.total >= 40;
    			},
    		seconds,
    		60,
    		function () {
    				seconds.multiplier.addBase(1);
    			}),
    		new Upgrade('Increase Seconds base by yet another 100%',
    		function () {
    				return seconds.total >= 80;
    			},
    		seconds,
    		100,
    		function () {
    				seconds.multiplier.addBase(1);
    			}),
    		new Upgrade('Double Minutes',
    		function () {
    				return minutes.total >= 5;
    			},
    		minutes,
    		10,
    		function () {
    				minutes.multiplier.multiplyFactor(2);
    			}),
    		new Upgrade('Triple Minutes',
    		function () {
    				return minutes.total >= 10;
    			},
    		minutes,
    		15,
    		function () {
    				minutes.multiplier.multiplyFactor(3);
    			}),
    		new Upgrade('Seconds gain is squared',
    		function () {
    				return hours.total >= 1;
    			},
    		hours,
    		1,
    		function () {
    				seconds.exponent.multiplyFactor(2);
    			}),
    		new Upgrade('Increase Minutes gain by total Hours',
    		function () {
    				return hours.total >= 1;
    			},
    		hours,
    		1,
    		function () {
    				minutes.multiplier.addBaseFunction(function () {
    					return hours.total;
    				});
    			})
    	];

    	var points = 0;
    	var intervalID = null;

    	function start() {
    		console.log("Starting...");
    		clearInterval(intervalID);
    		intervalID = setInterval(() => onTick(), 50);
    	}

    	function stop() {
    		console.log("Stopping...");
    		clearInterval(intervalID);
    		intervalID = null;
    	}

    	function attemptPurchase(upgrade) {
    		let success = upgrade.purchase();

    		if (success) {
    			$$invalidate(2, upgrades = upgrades.filter(value => value.name !== upgrade.name));
    			console.log('Successfully purchased upgrade "' + upgrade.name + '"');
    		} else {
    			console.log('Purchase failed');
    		}

    		return success;
    	}

    	function onTick() {
    		let tickrate = speedMult / 20;
    		let firstUnitMod = Math.pow(pipeline.timeUnitRelations[0].fromUnit.multiplier.calculate(), pipeline.timeUnitRelations[0].fromUnit.exponent.calculate());
    		let increase = firstUnitMod * (1 + Math.log(points + 1)) * pipeline.getRatio() * tickrate;
    		$$invalidate(3, points += increase);
    		$$invalidate(2, upgrades); // Without this line, newly-visible upgrades don't appear because reasons
    		$$invalidate(1, pipeline.timeUnitRelations[0].fromUnit.value += increase, pipeline);
    		$$invalidate(1, pipeline.timeUnitRelations[0].fromUnit.total += increase, pipeline);
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

    	const click_handler = function (upgrade) {
    		attemptPurchase(upgrade);
    	};

    	$$self.$capture_state = () => ({
    		TimeUnit,
    		TimeUnitRelation,
    		TimeUnitPipeline,
    		Upgrade,
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
    		upgrades,
    		points,
    		intervalID,
    		start,
    		stop,
    		attemptPurchase,
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
    		if ('upgrades' in $$props) $$invalidate(2, upgrades = $$props.upgrades);
    		if ('points' in $$props) $$invalidate(3, points = $$props.points);
    		if ('intervalID' in $$props) intervalID = $$props.intervalID;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		speedMult,
    		pipeline,
    		upgrades,
    		points,
    		start,
    		stop,
    		attemptPurchase,
    		input0_input_handler,
    		input1_change_input_handler,
    		click_handler
    	];
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
