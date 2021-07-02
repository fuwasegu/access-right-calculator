
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
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
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
                start_hydrating();
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
            end_hydrating();
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
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

    /* src/Header.svelte generated by Svelte v3.38.3 */

    const file$5 = "src/Header.svelte";

    function create_fragment$5(ctx) {
    	let div2;
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Calculator for File Permissions";
    			attr_dev(div0, "class", "title svelte-4xicw");
    			add_location(div0, file$5, 6, 8, 81);
    			attr_dev(div1, "class", "content svelte-4xicw");
    			add_location(div1, file$5, 5, 4, 51);
    			attr_dev(div2, "class", "header-area svelte-4xicw");
    			add_location(div2, file$5, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* node_modules/svelte-tooltip/src/SvelteTooltip.svelte generated by Svelte v3.38.3 */

    const file$4 = "node_modules/svelte-tooltip/src/SvelteTooltip.svelte";
    const get_custom_tip_slot_changes = dirty => ({});
    const get_custom_tip_slot_context = ctx => ({});

    // (85:4) {:else}
    function create_else_block(ctx) {
    	let current;
    	const custom_tip_slot_template = /*#slots*/ ctx[9]["custom-tip"];
    	const custom_tip_slot = create_slot(custom_tip_slot_template, ctx, /*$$scope*/ ctx[8], get_custom_tip_slot_context);

    	const block = {
    		c: function create() {
    			if (custom_tip_slot) custom_tip_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (custom_tip_slot) {
    				custom_tip_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (custom_tip_slot) {
    				if (custom_tip_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(custom_tip_slot, custom_tip_slot_template, ctx, /*$$scope*/ ctx[8], !current ? -1 : dirty, get_custom_tip_slot_changes, get_custom_tip_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(custom_tip_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(custom_tip_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (custom_tip_slot) custom_tip_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(85:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (83:4) {#if tip}
    function create_if_block(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*tip*/ ctx[0]);
    			attr_dev(div, "class", "default-tip svelte-16glvw6");
    			attr_dev(div, "style", /*style*/ ctx[6]);
    			add_location(div, file$4, 83, 6, 1459);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tip*/ 1) set_data_dev(t, /*tip*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(83:4) {#if tip}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div1;
    	let span;
    	let t;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*tip*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t = space();
    			div0 = element("div");
    			if_block.c();
    			attr_dev(span, "class", "tooltip-slot svelte-16glvw6");
    			add_location(span, file$4, 72, 2, 1281);
    			attr_dev(div0, "class", "tooltip svelte-16glvw6");
    			toggle_class(div0, "active", /*active*/ ctx[5]);
    			toggle_class(div0, "left", /*left*/ ctx[4]);
    			toggle_class(div0, "right", /*right*/ ctx[2]);
    			toggle_class(div0, "bottom", /*bottom*/ ctx[3]);
    			toggle_class(div0, "top", /*top*/ ctx[1]);
    			add_location(div0, file$4, 75, 2, 1334);
    			attr_dev(div1, "class", "tooltip-wrapper svelte-16glvw6");
    			add_location(div1, file$4, 71, 0, 1249);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append_dev(div1, t);
    			append_dev(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], !current ? -1 : dirty, null, null);
    				}
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}

    			if (dirty & /*active*/ 32) {
    				toggle_class(div0, "active", /*active*/ ctx[5]);
    			}

    			if (dirty & /*left*/ 16) {
    				toggle_class(div0, "left", /*left*/ ctx[4]);
    			}

    			if (dirty & /*right*/ 4) {
    				toggle_class(div0, "right", /*right*/ ctx[2]);
    			}

    			if (dirty & /*bottom*/ 8) {
    				toggle_class(div0, "bottom", /*bottom*/ ctx[3]);
    			}

    			if (dirty & /*top*/ 2) {
    				toggle_class(div0, "top", /*top*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SvelteTooltip", slots, ['default','custom-tip']);
    	let { tip = "" } = $$props;
    	let { top = false } = $$props;
    	let { right = false } = $$props;
    	let { bottom = false } = $$props;
    	let { left = false } = $$props;
    	let { active = false } = $$props;
    	let { color = "#757575" } = $$props;
    	let style = `background-color: ${color};`;
    	const writable_props = ["tip", "top", "right", "bottom", "left", "active", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SvelteTooltip> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("tip" in $$props) $$invalidate(0, tip = $$props.tip);
    		if ("top" in $$props) $$invalidate(1, top = $$props.top);
    		if ("right" in $$props) $$invalidate(2, right = $$props.right);
    		if ("bottom" in $$props) $$invalidate(3, bottom = $$props.bottom);
    		if ("left" in $$props) $$invalidate(4, left = $$props.left);
    		if ("active" in $$props) $$invalidate(5, active = $$props.active);
    		if ("color" in $$props) $$invalidate(7, color = $$props.color);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		tip,
    		top,
    		right,
    		bottom,
    		left,
    		active,
    		color,
    		style
    	});

    	$$self.$inject_state = $$props => {
    		if ("tip" in $$props) $$invalidate(0, tip = $$props.tip);
    		if ("top" in $$props) $$invalidate(1, top = $$props.top);
    		if ("right" in $$props) $$invalidate(2, right = $$props.right);
    		if ("bottom" in $$props) $$invalidate(3, bottom = $$props.bottom);
    		if ("left" in $$props) $$invalidate(4, left = $$props.left);
    		if ("active" in $$props) $$invalidate(5, active = $$props.active);
    		if ("color" in $$props) $$invalidate(7, color = $$props.color);
    		if ("style" in $$props) $$invalidate(6, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tip, top, right, bottom, left, active, style, color, $$scope, slots];
    }

    class SvelteTooltip extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			tip: 0,
    			top: 1,
    			right: 2,
    			bottom: 3,
    			left: 4,
    			active: 5,
    			color: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvelteTooltip",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get tip() {
    		throw new Error("<SvelteTooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tip(value) {
    		throw new Error("<SvelteTooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get top() {
    		throw new Error("<SvelteTooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set top(value) {
    		throw new Error("<SvelteTooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get right() {
    		throw new Error("<SvelteTooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set right(value) {
    		throw new Error("<SvelteTooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bottom() {
    		throw new Error("<SvelteTooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bottom(value) {
    		throw new Error("<SvelteTooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get left() {
    		throw new Error("<SvelteTooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set left(value) {
    		throw new Error("<SvelteTooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<SvelteTooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<SvelteTooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<SvelteTooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<SvelteTooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/PermissonComponent.svelte generated by Svelte v3.38.3 */
    const file$3 = "src/PermissonComponent.svelte";

    // (41:8) <SvelteTooltip tip="{discription}" top >
    function create_default_slot_3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*ownershipName*/ ctx[1]);
    			attr_dev(span, "class", "ownership-name");
    			add_location(span, file$3, 41, 12, 1364);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ownershipName*/ 2) set_data_dev(t, /*ownershipName*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(41:8) <SvelteTooltip tip=\\\"{discription}\\\" top >",
    		ctx
    	});

    	return block;
    }

    // (46:8) <SvelteTooltip tip="{ownershipName} can read" top >
    function create_default_slot_2$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "r";
    			attr_dev(button, "class", "svelte-1407xj3");
    			toggle_class(button, "active", /*activeRead*/ ctx[2]);
    			add_location(button, file$3, 46, 12, 1553);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeRead*/ 4) {
    				toggle_class(button, "active", /*activeRead*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(46:8) <SvelteTooltip tip=\\\"{ownershipName} can read\\\" top >",
    		ctx
    	});

    	return block;
    }

    // (49:8) <SvelteTooltip tip="{ownershipName} can write" top >
    function create_default_slot_1$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "w";
    			attr_dev(button, "class", "svelte-1407xj3");
    			toggle_class(button, "active", /*activeWrite*/ ctx[3]);
    			add_location(button, file$3, 49, 12, 1740);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeWrite*/ 8) {
    				toggle_class(button, "active", /*activeWrite*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(49:8) <SvelteTooltip tip=\\\"{ownershipName} can write\\\" top >",
    		ctx
    	});

    	return block;
    }

    // (52:8) <SvelteTooltip tip="{ownershipName} can execute" top >
    function create_default_slot$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "x";
    			attr_dev(button, "class", "svelte-1407xj3");
    			toggle_class(button, "active", /*activeExecutable*/ ctx[4]);
    			add_location(button, file$3, 52, 12, 1932);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeExecutable*/ 16) {
    				toggle_class(button, "active", /*activeExecutable*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(52:8) <SvelteTooltip tip=\\\"{ownershipName} can execute\\\" top >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div4;
    	let div0;
    	let sveltetooltip0;
    	let t0;
    	let div1;
    	let sveltetooltip1;
    	let t1;
    	let sveltetooltip2;
    	let t2;
    	let sveltetooltip3;
    	let t3;
    	let div2;
    	let span0;
    	let t4;
    	let t5;
    	let span1;
    	let t6;
    	let t7;
    	let span2;
    	let t8;
    	let t9;
    	let div3;
    	let span3;
    	let t10;
    	let current;

    	sveltetooltip0 = new SvelteTooltip({
    			props: {
    				tip: /*discription*/ ctx[8],
    				top: true,
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	sveltetooltip1 = new SvelteTooltip({
    			props: {
    				tip: "" + (/*ownershipName*/ ctx[1] + " can read"),
    				top: true,
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	sveltetooltip2 = new SvelteTooltip({
    			props: {
    				tip: "" + (/*ownershipName*/ ctx[1] + " can write"),
    				top: true,
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	sveltetooltip3 = new SvelteTooltip({
    			props: {
    				tip: "" + (/*ownershipName*/ ctx[1] + " can execute"),
    				top: true,
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			create_component(sveltetooltip0.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(sveltetooltip1.$$.fragment);
    			t1 = space();
    			create_component(sveltetooltip2.$$.fragment);
    			t2 = space();
    			create_component(sveltetooltip3.$$.fragment);
    			t3 = space();
    			div2 = element("div");
    			span0 = element("span");
    			t4 = text(/*activeReadBinaly*/ ctx[5]);
    			t5 = space();
    			span1 = element("span");
    			t6 = text(/*activeWriteBinaly*/ ctx[6]);
    			t7 = space();
    			span2 = element("span");
    			t8 = text(/*activeExecutableBinaly*/ ctx[7]);
    			t9 = space();
    			div3 = element("div");
    			span3 = element("span");
    			t10 = text(/*decimalExecutionRight*/ ctx[0]);
    			attr_dev(div0, "class", "ownership-name-area svelte-1407xj3");
    			add_location(div0, file$3, 39, 4, 1269);
    			attr_dev(div1, "class", "input-area svelte-1407xj3");
    			add_location(div1, file$3, 44, 4, 1456);
    			attr_dev(span0, "class", "binaly-digit-area svelte-1407xj3");
    			add_location(span0, file$3, 56, 8, 2113);
    			attr_dev(span1, "class", "binaly-digit-area svelte-1407xj3");
    			add_location(span1, file$3, 57, 8, 2179);
    			attr_dev(span2, "class", "binaly-digit-area svelte-1407xj3");
    			add_location(span2, file$3, 58, 8, 2246);
    			attr_dev(div2, "class", "binary-area svelte-1407xj3");
    			add_location(div2, file$3, 55, 4, 2079);
    			attr_dev(span3, "class", "decimal-digit-area");
    			add_location(span3, file$3, 61, 8, 2360);
    			attr_dev(div3, "class", "decimal-area svelte-1407xj3");
    			add_location(div3, file$3, 60, 4, 2325);
    			attr_dev(div4, "class", "ownership-area svelte-1407xj3");
    			add_location(div4, file$3, 38, 0, 1236);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			mount_component(sveltetooltip0, div0, null);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			mount_component(sveltetooltip1, div1, null);
    			append_dev(div1, t1);
    			mount_component(sveltetooltip2, div1, null);
    			append_dev(div1, t2);
    			mount_component(sveltetooltip3, div1, null);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div2, span0);
    			append_dev(span0, t4);
    			append_dev(div2, t5);
    			append_dev(div2, span1);
    			append_dev(span1, t6);
    			append_dev(div2, t7);
    			append_dev(div2, span2);
    			append_dev(span2, t8);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, span3);
    			append_dev(span3, t10);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const sveltetooltip0_changes = {};
    			if (dirty & /*discription*/ 256) sveltetooltip0_changes.tip = /*discription*/ ctx[8];

    			if (dirty & /*$$scope, ownershipName*/ 8194) {
    				sveltetooltip0_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip0.$set(sveltetooltip0_changes);
    			const sveltetooltip1_changes = {};
    			if (dirty & /*ownershipName*/ 2) sveltetooltip1_changes.tip = "" + (/*ownershipName*/ ctx[1] + " can read");

    			if (dirty & /*$$scope, activeRead*/ 8196) {
    				sveltetooltip1_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip1.$set(sveltetooltip1_changes);
    			const sveltetooltip2_changes = {};
    			if (dirty & /*ownershipName*/ 2) sveltetooltip2_changes.tip = "" + (/*ownershipName*/ ctx[1] + " can write");

    			if (dirty & /*$$scope, activeWrite*/ 8200) {
    				sveltetooltip2_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip2.$set(sveltetooltip2_changes);
    			const sveltetooltip3_changes = {};
    			if (dirty & /*ownershipName*/ 2) sveltetooltip3_changes.tip = "" + (/*ownershipName*/ ctx[1] + " can execute");

    			if (dirty & /*$$scope, activeExecutable*/ 8208) {
    				sveltetooltip3_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip3.$set(sveltetooltip3_changes);
    			if (!current || dirty & /*activeReadBinaly*/ 32) set_data_dev(t4, /*activeReadBinaly*/ ctx[5]);
    			if (!current || dirty & /*activeWriteBinaly*/ 64) set_data_dev(t6, /*activeWriteBinaly*/ ctx[6]);
    			if (!current || dirty & /*activeExecutableBinaly*/ 128) set_data_dev(t8, /*activeExecutableBinaly*/ ctx[7]);
    			if (!current || dirty & /*decimalExecutionRight*/ 1) set_data_dev(t10, /*decimalExecutionRight*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sveltetooltip0.$$.fragment, local);
    			transition_in(sveltetooltip1.$$.fragment, local);
    			transition_in(sveltetooltip2.$$.fragment, local);
    			transition_in(sveltetooltip3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sveltetooltip0.$$.fragment, local);
    			transition_out(sveltetooltip1.$$.fragment, local);
    			transition_out(sveltetooltip2.$$.fragment, local);
    			transition_out(sveltetooltip3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(sveltetooltip0);
    			destroy_component(sveltetooltip1);
    			destroy_component(sveltetooltip2);
    			destroy_component(sveltetooltip3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let activeReadBinaly;
    	let activeWriteBinaly;
    	let activeExecutableBinaly;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PermissonComponent", slots, []);
    	let { ownershipName } = $$props;
    	let { decimalExecutionRight } = $$props;
    	let activeRead = false;
    	let activeWrite = false;
    	let activeExecutable = false;
    	let discription = "";

    	const calcExecutionRight = (read, write, executable) => {
    		$$invalidate(0, decimalExecutionRight = 4 * read + 2 * write + executable);
    	};

    	onMount(() => {
    		switch (ownershipName) {
    			case "Owner":
    				$$invalidate(8, discription = "Permissions used by the assigned owner of the file or directory");
    				break;
    			case "Group":
    				$$invalidate(8, discription = "Permissions used by members of the group that owns the file or directory");
    				break;
    			case "Other":
    				$$invalidate(8, discription = "Permissions used by all users other than the file owner, and members of the group that owns the file or the directory");
    				break;
    		}
    	});

    	const writable_props = ["ownershipName", "decimalExecutionRight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PermissonComponent> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(2, activeRead = !activeRead);
    	const click_handler_1 = () => $$invalidate(3, activeWrite = !activeWrite);
    	const click_handler_2 = () => $$invalidate(4, activeExecutable = !activeExecutable);

    	$$self.$$set = $$props => {
    		if ("ownershipName" in $$props) $$invalidate(1, ownershipName = $$props.ownershipName);
    		if ("decimalExecutionRight" in $$props) $$invalidate(0, decimalExecutionRight = $$props.decimalExecutionRight);
    	};

    	$$self.$capture_state = () => ({
    		SvelteTooltip,
    		onMount,
    		ownershipName,
    		decimalExecutionRight,
    		activeRead,
    		activeWrite,
    		activeExecutable,
    		discription,
    		calcExecutionRight,
    		activeReadBinaly,
    		activeWriteBinaly,
    		activeExecutableBinaly
    	});

    	$$self.$inject_state = $$props => {
    		if ("ownershipName" in $$props) $$invalidate(1, ownershipName = $$props.ownershipName);
    		if ("decimalExecutionRight" in $$props) $$invalidate(0, decimalExecutionRight = $$props.decimalExecutionRight);
    		if ("activeRead" in $$props) $$invalidate(2, activeRead = $$props.activeRead);
    		if ("activeWrite" in $$props) $$invalidate(3, activeWrite = $$props.activeWrite);
    		if ("activeExecutable" in $$props) $$invalidate(4, activeExecutable = $$props.activeExecutable);
    		if ("discription" in $$props) $$invalidate(8, discription = $$props.discription);
    		if ("activeReadBinaly" in $$props) $$invalidate(5, activeReadBinaly = $$props.activeReadBinaly);
    		if ("activeWriteBinaly" in $$props) $$invalidate(6, activeWriteBinaly = $$props.activeWriteBinaly);
    		if ("activeExecutableBinaly" in $$props) $$invalidate(7, activeExecutableBinaly = $$props.activeExecutableBinaly);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*activeRead*/ 4) {
    			$$invalidate(5, activeReadBinaly = activeRead ? 1 : 0);
    		}

    		if ($$self.$$.dirty & /*activeWrite*/ 8) {
    			$$invalidate(6, activeWriteBinaly = activeWrite ? 1 : 0);
    		}

    		if ($$self.$$.dirty & /*activeExecutable*/ 16) {
    			$$invalidate(7, activeExecutableBinaly = activeExecutable ? 1 : 0);
    		}

    		if ($$self.$$.dirty & /*activeReadBinaly, activeWriteBinaly, activeExecutableBinaly*/ 224) {
    			calcExecutionRight(activeReadBinaly, activeWriteBinaly, activeExecutableBinaly);
    		}
    	};

    	return [
    		decimalExecutionRight,
    		ownershipName,
    		activeRead,
    		activeWrite,
    		activeExecutable,
    		activeReadBinaly,
    		activeWriteBinaly,
    		activeExecutableBinaly,
    		discription,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class PermissonComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			ownershipName: 1,
    			decimalExecutionRight: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PermissonComponent",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ownershipName*/ ctx[1] === undefined && !("ownershipName" in props)) {
    			console.warn("<PermissonComponent> was created without expected prop 'ownershipName'");
    		}

    		if (/*decimalExecutionRight*/ ctx[0] === undefined && !("decimalExecutionRight" in props)) {
    			console.warn("<PermissonComponent> was created without expected prop 'decimalExecutionRight'");
    		}
    	}

    	get ownershipName() {
    		throw new Error("<PermissonComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ownershipName(value) {
    		throw new Error("<PermissonComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get decimalExecutionRight() {
    		throw new Error("<PermissonComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set decimalExecutionRight(value) {
    		throw new Error("<PermissonComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/InputPathComponent.svelte generated by Svelte v3.38.3 */
    const file$2 = "src/InputPathComponent.svelte";

    // (72:8) <SvelteTooltip tip="Change files and directories recursively." >
    function create_default_slot_2(ctx) {
    	let label;
    	let input;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t = text("-R");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "option-r");
    			attr_dev(input, "class", "svelte-tarjms");
    			add_location(input, file$2, 72, 34, 1911);
    			attr_dev(label, "for", "option-r");
    			add_location(label, file$2, 72, 12, 1889);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = /*isOptionR*/ ctx[6];
    			append_dev(label, t);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[13]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isOptionR*/ 64) {
    				input.checked = /*isOptionR*/ ctx[6];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(72:8) <SvelteTooltip tip=\\\"Change files and directories recursively.\\\" >",
    		ctx
    	});

    	return block;
    }

    // (75:8) <SvelteTooltip tip="Verbose mode; output a diagnostic message for every file processed." >
    function create_default_slot_1(ctx) {
    	let label;
    	let input;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t = text("-v");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "option-v");
    			attr_dev(input, "class", "svelte-tarjms");
    			add_location(input, file$2, 75, 34, 2142);
    			attr_dev(label, "for", "option-v");
    			add_location(label, file$2, 75, 12, 2120);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = /*isOptionV*/ ctx[7];
    			append_dev(label, t);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler_1*/ ctx[14]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isOptionV*/ 128) {
    				input.checked = /*isOptionV*/ ctx[7];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(75:8) <SvelteTooltip tip=\\\"Verbose mode; output a diagnostic message for every file processed.\\\" >",
    		ctx
    	});

    	return block;
    }

    // (77:8) <SvelteTooltip tip="Quiet mode; suppress most error messages." >
    function create_default_slot(ctx) {
    	let label;
    	let input;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t = text("-f");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "option-f");
    			attr_dev(input, "class", "svelte-tarjms");
    			add_location(input, file$2, 77, 34, 2338);
    			attr_dev(label, "for", "option-f");
    			add_location(label, file$2, 77, 12, 2316);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = /*isOptionF*/ ctx[5];
    			append_dev(label, t);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler_2*/ ctx[15]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isOptionF*/ 32) {
    				input.checked = /*isOptionF*/ ctx[5];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(77:8) <SvelteTooltip tip=\\\"Quiet mode; suppress most error messages.\\\" >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div2;
    	let label;
    	let t0;
    	let input;
    	let t1;
    	let div0;
    	let span0;
    	let t3;
    	let sveltetooltip0;
    	let t4;
    	let sveltetooltip1;
    	let t5;
    	let sveltetooltip2;
    	let t6;
    	let div1;
    	let button0;
    	let t8;
    	let button1;
    	let t10;
    	let div4;
    	let div3;
    	let i;
    	let t11;
    	let span2;
    	let t12;
    	let span1;
    	let t13;
    	let t14;
    	let t15;
    	let t16;
    	let t17;
    	let t18;
    	let t19;
    	let current;
    	let mounted;
    	let dispose;

    	sveltetooltip0 = new SvelteTooltip({
    			props: {
    				tip: "Change files and directories recursively.",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	sveltetooltip1 = new SvelteTooltip({
    			props: {
    				tip: "Verbose mode; output a diagnostic message for every file processed.",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	sveltetooltip2 = new SvelteTooltip({
    			props: {
    				tip: "Quiet mode; suppress most error messages.",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			label = element("label");
    			t0 = text("Path (Directry or File)");
    			input = element("input");
    			t1 = space();
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Options";
    			t3 = space();
    			create_component(sveltetooltip0.$$.fragment);
    			t4 = space();
    			create_component(sveltetooltip1.$$.fragment);
    			t5 = space();
    			create_component(sveltetooltip2.$$.fragment);
    			t6 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Create Command!";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Clear";
    			t10 = space();
    			div4 = element("div");
    			div3 = element("div");
    			i = element("i");
    			t11 = space();
    			span2 = element("span");
    			t12 = text("$   ");
    			span1 = element("span");
    			t13 = text(/*chmod*/ ctx[2]);
    			t14 = space();
    			t15 = text(/*options*/ ctx[4]);
    			t16 = space();
    			t17 = text(/*number*/ ctx[3]);
    			t18 = space();
    			t19 = text(/*path*/ ctx[0]);
    			attr_dev(input, "name", "path");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "example: /your-project/src/main.py");
    			attr_dev(input, "class", "svelte-tarjms");
    			add_location(input, file$2, 67, 31, 1623);
    			attr_dev(label, "class", "path-label-area svelte-tarjms");
    			add_location(label, file$2, 66, 4, 1560);
    			add_location(span0, file$2, 70, 8, 1783);
    			attr_dev(div0, "class", "options-area svelte-tarjms");
    			add_location(div0, file$2, 69, 4, 1748);
    			add_location(button0, file$2, 81, 8, 2485);
    			add_location(button1, file$2, 82, 8, 2553);
    			attr_dev(div1, "class", "button-area");
    			add_location(div1, file$2, 80, 4, 2451);
    			attr_dev(div2, "class", "container svelte-tarjms");
    			add_location(div2, file$2, 65, 0, 1532);
    			attr_dev(i, "class", "fas fa-paste");
    			set_style(i, "color", "white");
    			add_location(i, file$2, 88, 56, 2706);
    			attr_dev(div3, "class", "copy-area svelte-tarjms");
    			add_location(div3, file$2, 88, 4, 2654);
    			attr_dev(span1, "id", "copy-target");
    			attr_dev(span1, "class", "svelte-tarjms");
    			add_location(span1, file$2, 89, 32, 2795);
    			attr_dev(span2, "class", "code svelte-tarjms");
    			add_location(span2, file$2, 89, 4, 2767);
    			attr_dev(div4, "class", "code-area svelte-tarjms");
    			add_location(div4, file$2, 87, 0, 2626);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, label);
    			append_dev(label, t0);
    			append_dev(label, input);
    			set_input_value(input, /*inputedPath*/ ctx[1]);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t3);
    			mount_component(sveltetooltip0, div0, null);
    			append_dev(div0, t4);
    			mount_component(sveltetooltip1, div0, null);
    			append_dev(div0, t5);
    			mount_component(sveltetooltip2, div0, null);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t8);
    			append_dev(div1, button1);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, i);
    			append_dev(div4, t11);
    			append_dev(div4, span2);
    			append_dev(span2, t12);
    			append_dev(span2, span1);
    			append_dev(span1, t13);
    			append_dev(span1, t14);
    			append_dev(span1, t15);
    			append_dev(span1, t16);
    			append_dev(span1, t17);
    			append_dev(span1, t18);
    			append_dev(span1, t19);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[12]),
    					listen_dev(button0, "click", /*createCommand*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*clearCommand*/ ctx[9], false, false, false),
    					listen_dev(div3, "click", /*copyToaClipboad*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*inputedPath*/ 2 && input.value !== /*inputedPath*/ ctx[1]) {
    				set_input_value(input, /*inputedPath*/ ctx[1]);
    			}

    			const sveltetooltip0_changes = {};

    			if (dirty & /*$$scope, isOptionR*/ 524352) {
    				sveltetooltip0_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip0.$set(sveltetooltip0_changes);
    			const sveltetooltip1_changes = {};

    			if (dirty & /*$$scope, isOptionV*/ 524416) {
    				sveltetooltip1_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip1.$set(sveltetooltip1_changes);
    			const sveltetooltip2_changes = {};

    			if (dirty & /*$$scope, isOptionF*/ 524320) {
    				sveltetooltip2_changes.$$scope = { dirty, ctx };
    			}

    			sveltetooltip2.$set(sveltetooltip2_changes);
    			if (!current || dirty & /*chmod*/ 4) set_data_dev(t13, /*chmod*/ ctx[2]);
    			if (!current || dirty & /*options*/ 16) set_data_dev(t15, /*options*/ ctx[4]);
    			if (!current || dirty & /*number*/ 8) set_data_dev(t17, /*number*/ ctx[3]);
    			if (!current || dirty & /*path*/ 1) set_data_dev(t19, /*path*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sveltetooltip0.$$.fragment, local);
    			transition_in(sveltetooltip1.$$.fragment, local);
    			transition_in(sveltetooltip2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sveltetooltip0.$$.fragment, local);
    			transition_out(sveltetooltip1.$$.fragment, local);
    			transition_out(sveltetooltip2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(sveltetooltip0);
    			destroy_component(sveltetooltip1);
    			destroy_component(sveltetooltip2);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("InputPathComponent", slots, []);
    	let { permissionNumber = "" } = $$props;
    	let path = "";
    	let inputedPath = "";
    	let chmod = "";
    	let number = "";
    	let optionF = "";
    	let optionR = "";
    	let optionV = "";
    	let options = "";
    	let isOptionF = false;
    	let isOptionR = false;
    	let isOptionV = false;

    	const createCommand = () => {
    		$$invalidate(2, chmod = "chmod");
    		$$invalidate(3, number = permissionNumber);
    		$$invalidate(0, path = inputedPath);

    		if (isOptionR) {
    			optionR = "-R ";
    		} else {
    			optionR = "";
    		}

    		if (isOptionV) {
    			optionV = "-v ";
    		} else {
    			optionV = "";
    		}

    		if (isOptionF) {
    			optionF = "-f ";
    		} else {
    			optionF = "";
    		}

    		$$invalidate(4, options = optionR + optionV + optionF);
    	};

    	const clearCommand = () => {
    		$$invalidate(2, chmod = "");
    		$$invalidate(3, number = "");
    		$$invalidate(0, path = "");
    		optionF = "";
    		optionR = "";
    		optionV = "";
    		$$invalidate(4, options = "");
    		$$invalidate(1, inputedPath = "");
    		$$invalidate(5, isOptionF = false);
    		$$invalidate(6, isOptionR = false);
    		$$invalidate(7, isOptionV = false);
    	};

    	const copyToaClipboad = () => {
    		let range = document.createRange();
    		let span = document.getElementById("copy-target");
    		range.selectNodeContents(span);
    		let selection = document.getSelection();
    		selection.removeAllRanges();
    		selection.addRange(range);
    		document.execCommand("copy");
    		alert("Copied!");
    	};

    	const writable_props = ["permissionNumber"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InputPathComponent> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		inputedPath = this.value;
    		$$invalidate(1, inputedPath);
    	}

    	function input_change_handler() {
    		isOptionR = this.checked;
    		$$invalidate(6, isOptionR);
    	}

    	function input_change_handler_1() {
    		isOptionV = this.checked;
    		$$invalidate(7, isOptionV);
    	}

    	function input_change_handler_2() {
    		isOptionF = this.checked;
    		$$invalidate(5, isOptionF);
    	}

    	$$self.$$set = $$props => {
    		if ("permissionNumber" in $$props) $$invalidate(11, permissionNumber = $$props.permissionNumber);
    	};

    	$$self.$capture_state = () => ({
    		SvelteTooltip,
    		permissionNumber,
    		path,
    		inputedPath,
    		chmod,
    		number,
    		optionF,
    		optionR,
    		optionV,
    		options,
    		isOptionF,
    		isOptionR,
    		isOptionV,
    		createCommand,
    		clearCommand,
    		copyToaClipboad
    	});

    	$$self.$inject_state = $$props => {
    		if ("permissionNumber" in $$props) $$invalidate(11, permissionNumber = $$props.permissionNumber);
    		if ("path" in $$props) $$invalidate(0, path = $$props.path);
    		if ("inputedPath" in $$props) $$invalidate(1, inputedPath = $$props.inputedPath);
    		if ("chmod" in $$props) $$invalidate(2, chmod = $$props.chmod);
    		if ("number" in $$props) $$invalidate(3, number = $$props.number);
    		if ("optionF" in $$props) optionF = $$props.optionF;
    		if ("optionR" in $$props) optionR = $$props.optionR;
    		if ("optionV" in $$props) optionV = $$props.optionV;
    		if ("options" in $$props) $$invalidate(4, options = $$props.options);
    		if ("isOptionF" in $$props) $$invalidate(5, isOptionF = $$props.isOptionF);
    		if ("isOptionR" in $$props) $$invalidate(6, isOptionR = $$props.isOptionR);
    		if ("isOptionV" in $$props) $$invalidate(7, isOptionV = $$props.isOptionV);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		path,
    		inputedPath,
    		chmod,
    		number,
    		options,
    		isOptionF,
    		isOptionR,
    		isOptionV,
    		createCommand,
    		clearCommand,
    		copyToaClipboad,
    		permissionNumber,
    		input_input_handler,
    		input_change_handler,
    		input_change_handler_1,
    		input_change_handler_2
    	];
    }

    class InputPathComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { permissionNumber: 11 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputPathComponent",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get permissionNumber() {
    		throw new Error("<InputPathComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set permissionNumber(value) {
    		throw new Error("<InputPathComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/PermissonTable.svelte generated by Svelte v3.38.3 */
    const file$1 = "src/PermissonTable.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let permissoncomponent0;
    	let updating_decimalExecutionRight;
    	let t0;
    	let permissoncomponent1;
    	let updating_decimalExecutionRight_1;
    	let t1;
    	let permissoncomponent2;
    	let updating_decimalExecutionRight_2;
    	let t2;
    	let inputpathcomponent;
    	let current;

    	function permissoncomponent0_decimalExecutionRight_binding(value) {
    		/*permissoncomponent0_decimalExecutionRight_binding*/ ctx[4](value);
    	}

    	let permissoncomponent0_props = { ownershipName: "Owner" };

    	if (/*ownerNumber*/ ctx[0] !== void 0) {
    		permissoncomponent0_props.decimalExecutionRight = /*ownerNumber*/ ctx[0];
    	}

    	permissoncomponent0 = new PermissonComponent({
    			props: permissoncomponent0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(permissoncomponent0, "decimalExecutionRight", permissoncomponent0_decimalExecutionRight_binding));

    	function permissoncomponent1_decimalExecutionRight_binding(value) {
    		/*permissoncomponent1_decimalExecutionRight_binding*/ ctx[5](value);
    	}

    	let permissoncomponent1_props = { ownershipName: "Group" };

    	if (/*groupNumber*/ ctx[1] !== void 0) {
    		permissoncomponent1_props.decimalExecutionRight = /*groupNumber*/ ctx[1];
    	}

    	permissoncomponent1 = new PermissonComponent({
    			props: permissoncomponent1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(permissoncomponent1, "decimalExecutionRight", permissoncomponent1_decimalExecutionRight_binding));

    	function permissoncomponent2_decimalExecutionRight_binding(value) {
    		/*permissoncomponent2_decimalExecutionRight_binding*/ ctx[6](value);
    	}

    	let permissoncomponent2_props = { ownershipName: "Other" };

    	if (/*otherNumber*/ ctx[2] !== void 0) {
    		permissoncomponent2_props.decimalExecutionRight = /*otherNumber*/ ctx[2];
    	}

    	permissoncomponent2 = new PermissonComponent({
    			props: permissoncomponent2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(permissoncomponent2, "decimalExecutionRight", permissoncomponent2_decimalExecutionRight_binding));

    	inputpathcomponent = new InputPathComponent({
    			props: {
    				permissionNumber: /*permissionNumber*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(permissoncomponent0.$$.fragment);
    			t0 = space();
    			create_component(permissoncomponent1.$$.fragment);
    			t1 = space();
    			create_component(permissoncomponent2.$$.fragment);
    			t2 = space();
    			create_component(inputpathcomponent.$$.fragment);
    			attr_dev(div, "class", "wrapper svelte-yj791i");
    			add_location(div, file$1, 12, 0, 317);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(permissoncomponent0, div, null);
    			append_dev(div, t0);
    			mount_component(permissoncomponent1, div, null);
    			append_dev(div, t1);
    			mount_component(permissoncomponent2, div, null);
    			insert_dev(target, t2, anchor);
    			mount_component(inputpathcomponent, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const permissoncomponent0_changes = {};

    			if (!updating_decimalExecutionRight && dirty & /*ownerNumber*/ 1) {
    				updating_decimalExecutionRight = true;
    				permissoncomponent0_changes.decimalExecutionRight = /*ownerNumber*/ ctx[0];
    				add_flush_callback(() => updating_decimalExecutionRight = false);
    			}

    			permissoncomponent0.$set(permissoncomponent0_changes);
    			const permissoncomponent1_changes = {};

    			if (!updating_decimalExecutionRight_1 && dirty & /*groupNumber*/ 2) {
    				updating_decimalExecutionRight_1 = true;
    				permissoncomponent1_changes.decimalExecutionRight = /*groupNumber*/ ctx[1];
    				add_flush_callback(() => updating_decimalExecutionRight_1 = false);
    			}

    			permissoncomponent1.$set(permissoncomponent1_changes);
    			const permissoncomponent2_changes = {};

    			if (!updating_decimalExecutionRight_2 && dirty & /*otherNumber*/ 4) {
    				updating_decimalExecutionRight_2 = true;
    				permissoncomponent2_changes.decimalExecutionRight = /*otherNumber*/ ctx[2];
    				add_flush_callback(() => updating_decimalExecutionRight_2 = false);
    			}

    			permissoncomponent2.$set(permissoncomponent2_changes);
    			const inputpathcomponent_changes = {};
    			if (dirty & /*permissionNumber*/ 8) inputpathcomponent_changes.permissionNumber = /*permissionNumber*/ ctx[3];
    			inputpathcomponent.$set(inputpathcomponent_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(permissoncomponent0.$$.fragment, local);
    			transition_in(permissoncomponent1.$$.fragment, local);
    			transition_in(permissoncomponent2.$$.fragment, local);
    			transition_in(inputpathcomponent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(permissoncomponent0.$$.fragment, local);
    			transition_out(permissoncomponent1.$$.fragment, local);
    			transition_out(permissoncomponent2.$$.fragment, local);
    			transition_out(inputpathcomponent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(permissoncomponent0);
    			destroy_component(permissoncomponent1);
    			destroy_component(permissoncomponent2);
    			if (detaching) detach_dev(t2);
    			destroy_component(inputpathcomponent, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let permissionNumber;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PermissonTable", slots, []);
    	let ownerNumber;
    	let groupNumber;
    	let otherNumber;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PermissonTable> was created with unknown prop '${key}'`);
    	});

    	function permissoncomponent0_decimalExecutionRight_binding(value) {
    		ownerNumber = value;
    		$$invalidate(0, ownerNumber);
    	}

    	function permissoncomponent1_decimalExecutionRight_binding(value) {
    		groupNumber = value;
    		$$invalidate(1, groupNumber);
    	}

    	function permissoncomponent2_decimalExecutionRight_binding(value) {
    		otherNumber = value;
    		$$invalidate(2, otherNumber);
    	}

    	$$self.$capture_state = () => ({
    		PermissonComponent,
    		InputPathComponent,
    		ownerNumber,
    		groupNumber,
    		otherNumber,
    		permissionNumber
    	});

    	$$self.$inject_state = $$props => {
    		if ("ownerNumber" in $$props) $$invalidate(0, ownerNumber = $$props.ownerNumber);
    		if ("groupNumber" in $$props) $$invalidate(1, groupNumber = $$props.groupNumber);
    		if ("otherNumber" in $$props) $$invalidate(2, otherNumber = $$props.otherNumber);
    		if ("permissionNumber" in $$props) $$invalidate(3, permissionNumber = $$props.permissionNumber);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ownerNumber, groupNumber, otherNumber*/ 7) {
    			$$invalidate(3, permissionNumber = String(ownerNumber) + String(groupNumber) + String(otherNumber));
    		}
    	};

    	return [
    		ownerNumber,
    		groupNumber,
    		otherNumber,
    		permissionNumber,
    		permissoncomponent0_decimalExecutionRight_binding,
    		permissoncomponent1_decimalExecutionRight_binding,
    		permissoncomponent2_decimalExecutionRight_binding
    	];
    }

    class PermissonTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PermissonTable",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.3 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let header;
    	let t;
    	let main;
    	let permissontable;
    	let current;
    	header = new Header({ $$inline: true });
    	permissontable = new PermissonTable({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t = space();
    			main = element("main");
    			create_component(permissontable.$$.fragment);
    			attr_dev(main, "class", "svelte-pgj0p");
    			add_location(main, file, 6, 0, 125);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(permissontable, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(permissontable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(permissontable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(main);
    			destroy_component(permissontable);
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
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, PermissonTable });
    	return [];
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

}());
//# sourceMappingURL=bundle.js.map
