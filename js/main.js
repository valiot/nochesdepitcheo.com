'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Featherlight - ultra slim jQuery lightbox
 * Version 1.7.12 - http://noelboss.github.io/featherlight/
 *
 * Copyright 2017, Noël Raoul Bossart (http://www.noelboss.com)
 * MIT Licensed.
**/
(function ($) {
	"use strict";

	if ('undefined' === typeof $) {
		if ('console' in window) {
			window.console.info('Too much lightness, Featherlight needs jQuery.');
		}
		return;
	}
	if ($.fn.jquery.match(/-ajax/)) {
		if ('console' in window) {
			window.console.info('Featherlight needs regular jQuery, not the slim version.');
		}
		return;
	}
	/* Featherlight is exported as $.featherlight.
    It is a function used to open a featherlight lightbox.
 	   [tech]
    Featherlight uses prototype inheritance.
    Each opened lightbox will have a corresponding object.
    That object may have some attributes that override the
    prototype's.
    Extensions created with Featherlight.extend will have their
    own prototype that inherits from Featherlight's prototype,
    thus attributes can be overriden either at the object level,
    or at the extension level.
    To create callbacks that chain themselves instead of overriding,
    use chainCallbacks.
    For those familiar with CoffeeScript, this correspond to
    Featherlight being a class and the Gallery being a class
    extending Featherlight.
    The chainCallbacks is used since we don't have access to
    CoffeeScript's `super`.
 */

	function Featherlight($content, config) {
		if (this instanceof Featherlight) {
			/* called with new */
			this.id = Featherlight.id++;
			this.setup($content, config);
			this.chainCallbacks(Featherlight._callbackChain);
		} else {
			var fl = new Featherlight($content, config);
			fl.open();
			return fl;
		}
	}

	var _opened = [],
	    pruneOpened = function pruneOpened(remove) {
		_opened = $.grep(_opened, function (fl) {
			return fl !== remove && fl.$instance.closest('body').length > 0;
		});
		return _opened;
	};

	// Removes keys of `set` from `obj` and returns the removed key/values.
	function slice(obj, set) {
		var r = {};
		for (var key in obj) {
			if (key in set) {
				r[key] = obj[key];
				delete obj[key];
			}
		}
		return r;
	}

	// NOTE: List of available [iframe attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe).
	var iFrameAttributeSet = {
		allowfullscreen: 1, frameborder: 1, height: 1, longdesc: 1, marginheight: 1, marginwidth: 1,
		name: 1, referrerpolicy: 1, scrolling: 1, sandbox: 1, src: 1, srcdoc: 1, width: 1
	};

	// Converts camelCased attributes to dasherized versions for given prefix:
	//   parseAttrs({hello: 1, hellFrozeOver: 2}, 'hell') => {froze-over: 2}
	function parseAttrs(obj, prefix) {
		var attrs = {},
		    regex = new RegExp('^' + prefix + '([A-Z])(.*)');
		for (var key in obj) {
			var match = key.match(regex);
			if (match) {
				var dasherized = (match[1] + match[2].replace(/([A-Z])/g, '-$1')).toLowerCase();
				attrs[dasherized] = obj[key];
			}
		}
		return attrs;
	}

	/* document wide key handler */
	var eventMap = { keyup: 'onKeyUp', resize: 'onResize' };

	var globalEventHandler = function globalEventHandler(event) {
		$.each(Featherlight.opened().reverse(), function () {
			if (!event.isDefaultPrevented()) {
				if (false === this[eventMap[event.type]](event)) {
					event.preventDefault();event.stopPropagation();return false;
				}
			}
		});
	};

	var toggleGlobalEvents = function toggleGlobalEvents(set) {
		if (set !== Featherlight._globalHandlerInstalled) {
			Featherlight._globalHandlerInstalled = set;
			var events = $.map(eventMap, function (_, name) {
				return name + '.' + Featherlight.prototype.namespace;
			}).join(' ');
			$(window)[set ? 'on' : 'off'](events, globalEventHandler);
		}
	};

	Featherlight.prototype = {
		constructor: Featherlight,
		/*** defaults ***/
		/* extend featherlight with defaults and methods */
		namespace: 'featherlight', /* Name of the events and css class prefix */
		targetAttr: 'data-featherlight', /* Attribute of the triggered element that contains the selector to the lightbox content */
		variant: null, /* Class that will be added to change look of the lightbox */
		resetCss: false, /* Reset all css */
		background: null, /* Custom DOM for the background, wrapper and the closebutton */
		openTrigger: 'click', /* Event that triggers the lightbox */
		closeTrigger: 'click', /* Event that triggers the closing of the lightbox */
		filter: null, /* Selector to filter events. Think $(...).on('click', filter, eventHandler) */
		root: 'body', /* Where to append featherlights */
		openSpeed: 250, /* Duration of opening animation */
		closeSpeed: 250, /* Duration of closing animation */
		closeOnClick: 'background', /* Close lightbox on click ('background', 'anywhere' or false) */
		closeOnEsc: true, /* Close lightbox when pressing esc */
		closeIcon: '&#10005;', /* Close icon */
		loading: '', /* Content to show while initial content is loading */
		persist: false, /* If set, the content will persist and will be shown again when opened again. 'shared' is a special value when binding multiple elements for them to share the same content */
		otherClose: null, /* Selector for alternate close buttons (e.g. "a.close") */
		beforeOpen: $.noop, /* Called before open. can return false to prevent opening of lightbox. Gets event as parameter, this contains all data */
		beforeContent: $.noop, /* Called when content is loaded. Gets event as parameter, this contains all data */
		beforeClose: $.noop, /* Called before close. can return false to prevent opening of lightbox. Gets event as parameter, this contains all data */
		afterOpen: $.noop, /* Called after open. Gets event as parameter, this contains all data */
		afterContent: $.noop, /* Called after content is ready and has been set. Gets event as parameter, this contains all data */
		afterClose: $.noop, /* Called after close. Gets event as parameter, this contains all data */
		onKeyUp: $.noop, /* Called on key up for the frontmost featherlight */
		onResize: $.noop, /* Called after new content and when a window is resized */
		type: null, /* Specify type of lightbox. If unset, it will check for the targetAttrs value. */
		contentFilters: ['jquery', 'image', 'html', 'ajax', 'iframe', 'text'], /* List of content filters to use to determine the content */

		/*** methods ***/
		/* setup iterates over a single instance of featherlight and prepares the background and binds the events */
		setup: function setup(target, config) {
			/* all arguments are optional */
			if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target instanceof $ === false && !config) {
				config = target;
				target = undefined;
			}

			var self = $.extend(this, config, { target: target }),
			    css = !self.resetCss ? self.namespace : self.namespace + '-reset',
			    /* by adding -reset to the classname, we reset all the default css */
			$background = $(self.background || ['<div class="' + css + '-loading ' + css + '">', '<div class="' + css + '-content">', '<button class="' + css + '-close-icon ' + self.namespace + '-close" aria-label="Close">', self.closeIcon, '</button>', '<div class="' + self.namespace + '-inner">' + self.loading + '</div>', '</div>', '</div>'].join('')),
			    closeButtonSelector = '.' + self.namespace + '-close' + (self.otherClose ? ',' + self.otherClose : '');

			self.$instance = $background.clone().addClass(self.variant); /* clone DOM for the background, wrapper and the close button */

			/* close when click on background/anywhere/null or closebox */
			self.$instance.on(self.closeTrigger + '.' + self.namespace, function (event) {
				if (event.isDefaultPrevented()) {
					return;
				}
				var $target = $(event.target);
				if ('background' === self.closeOnClick && $target.is('.' + self.namespace) || 'anywhere' === self.closeOnClick || $target.closest(closeButtonSelector).length) {
					self.close(event);
					event.preventDefault();
				}
			});

			return this;
		},

		/* this method prepares the content and converts it into a jQuery object or a promise */
		getContent: function getContent() {
			if (this.persist !== false && this.$content) {
				return this.$content;
			}
			var self = this,
			    filters = this.constructor.contentFilters,
			    readTargetAttr = function readTargetAttr(name) {
				return self.$currentTarget && self.$currentTarget.attr(name);
			},
			    targetValue = readTargetAttr(self.targetAttr),
			    data = self.target || targetValue || '';

			/* Find which filter applies */
			var filter = filters[self.type]; /* check explicit type like {type: 'image'} */

			/* check explicit type like data-featherlight="image" */
			if (!filter && data in filters) {
				filter = filters[data];
				data = self.target && targetValue;
			}
			data = data || readTargetAttr('href') || '';

			/* check explicity type & content like {image: 'photo.jpg'} */
			if (!filter) {
				for (var filterName in filters) {
					if (self[filterName]) {
						filter = filters[filterName];
						data = self[filterName];
					}
				}
			}

			/* otherwise it's implicit, run checks */
			if (!filter) {
				var target = data;
				data = null;
				$.each(self.contentFilters, function () {
					filter = filters[this];
					if (filter.test) {
						data = filter.test(target);
					}
					if (!data && filter.regex && target.match && target.match(filter.regex)) {
						data = target;
					}
					return !data;
				});
				if (!data) {
					if ('console' in window) {
						window.console.error('Featherlight: no content filter found ' + (target ? ' for "' + target + '"' : ' (no target specified)'));
					}
					return false;
				}
			}
			/* Process it */
			return filter.process.call(self, data);
		},

		/* sets the content of $instance to $content */
		setContent: function setContent($content) {
			this.$instance.removeClass(this.namespace + '-loading');

			/* we need a special class for the iframe */
			this.$instance.toggleClass(this.namespace + '-iframe', $content.is('iframe'));

			/* replace content by appending to existing one before it is removed
      this insures that featherlight-inner remain at the same relative
      position to any other items added to featherlight-content */
			this.$instance.find('.' + this.namespace + '-inner').not($content) /* excluded new content, important if persisted */
			.slice(1).remove().end() /* In the unexpected event where there are many inner elements, remove all but the first one */
			.replaceWith($.contains(this.$instance[0], $content[0]) ? '' : $content);

			this.$content = $content.addClass(this.namespace + '-inner');

			return this;
		},

		/* opens the lightbox. "this" contains $instance with the lightbox, and with the config.
  	Returns a promise that is resolved after is successfully opened. */
		open: function open(event) {
			var self = this;
			self.$instance.hide().appendTo(self.root);
			if ((!event || !event.isDefaultPrevented()) && self.beforeOpen(event) !== false) {

				if (event) {
					event.preventDefault();
				}
				var $content = self.getContent();

				if ($content) {
					_opened.push(self);

					toggleGlobalEvents(true);

					self.$instance.fadeIn(self.openSpeed);
					self.beforeContent(event);

					/* Set content and show */
					return $.when($content).always(function ($content) {
						self.setContent($content);
						self.afterContent(event);
					}).then(self.$instance.promise())
					/* Call afterOpen after fadeIn is done */
					.done(function () {
						self.afterOpen(event);
					});
				}
			}
			self.$instance.detach();
			return $.Deferred().reject().promise();
		},

		/* closes the lightbox. "this" contains $instance with the lightbox, and with the config
  	returns a promise, resolved after the lightbox is successfully closed. */
		close: function close(event) {
			var self = this,
			    deferred = $.Deferred();

			if (self.beforeClose(event) === false) {
				deferred.reject();
			} else {

				if (0 === pruneOpened(self).length) {
					toggleGlobalEvents(false);
				}

				self.$instance.fadeOut(self.closeSpeed, function () {
					self.$instance.detach();
					self.afterClose(event);
					deferred.resolve();
				});
			}
			return deferred.promise();
		},

		/* resizes the content so it fits in visible area and keeps the same aspect ratio.
  		Does nothing if either the width or the height is not specified.
  		Called automatically on window resize.
  		Override if you want different behavior. */
		resize: function resize(w, h) {
			if (w && h) {
				/* Reset apparent image size first so container grows */
				this.$content.css('width', '').css('height', '');
				/* Calculate the worst ratio so that dimensions fit */
				/* Note: -1 to avoid rounding errors */
				var ratio = Math.max(w / (this.$content.parent().width() - 1), h / (this.$content.parent().height() - 1));
				/* Resize content */
				if (ratio > 1) {
					ratio = h / Math.floor(h / ratio); /* Round ratio down so height calc works */
					this.$content.css('width', '' + w / ratio + 'px').css('height', '' + h / ratio + 'px');
				}
			}
		},

		/* Utility function to chain callbacks
     [Warning: guru-level]
     Used be extensions that want to let users specify callbacks but
     also need themselves to use the callbacks.
     The argument 'chain' has callback names as keys and function(super, event)
     as values. That function is meant to call `super` at some point.
  */
		chainCallbacks: function chainCallbacks(chain) {
			for (var name in chain) {
				this[name] = $.proxy(chain[name], this, $.proxy(this[name], this));
			}
		}
	};

	$.extend(Featherlight, {
		id: 0, /* Used to id single featherlight instances */
		autoBind: '[data-featherlight]', /* Will automatically bind elements matching this selector. Clear or set before onReady */
		defaults: Featherlight.prototype, /* You can access and override all defaults using $.featherlight.defaults, which is just a synonym for $.featherlight.prototype */
		/* Contains the logic to determine content */
		contentFilters: {
			jquery: {
				regex: /^[#.]\w/, /* Anything that starts with a class name or identifiers */
				test: function test(elem) {
					return elem instanceof $ && elem;
				},
				process: function process(elem) {
					return this.persist !== false ? $(elem) : $(elem).clone(true);
				}
			},
			image: {
				regex: /\.(png|jpg|jpeg|gif|tiff?|bmp|svg)(\?\S*)?$/i,
				process: function process(url) {
					var self = this,
					    deferred = $.Deferred(),
					    img = new Image(),
					    $img = $('<img src="' + url + '" alt="" class="' + self.namespace + '-image" />');
					img.onload = function () {
						/* Store naturalWidth & height for IE8 */
						$img.naturalWidth = img.width;$img.naturalHeight = img.height;
						deferred.resolve($img);
					};
					img.onerror = function () {
						deferred.reject($img);
					};
					img.src = url;
					return deferred.promise();
				}
			},
			html: {
				regex: /^\s*<[\w!][^<]*>/, /* Anything that starts with some kind of valid tag */
				process: function process(html) {
					return $(html);
				}
			},
			ajax: {
				regex: /./, /* At this point, any content is assumed to be an URL */
				process: function process(url) {
					var self = this,
					    deferred = $.Deferred();
					/* we are using load so one can specify a target with: url.html #targetelement */
					var $container = $('<div></div>').load(url, function (response, status) {
						if (status !== "error") {
							deferred.resolve($container.contents());
						}
						deferred.fail();
					});
					return deferred.promise();
				}
			},
			iframe: {
				process: function process(url) {
					var deferred = new $.Deferred();
					var $content = $('<iframe/>');
					var css = parseAttrs(this, 'iframe');
					var attrs = slice(css, iFrameAttributeSet);
					$content.hide().attr('src', url).attr(attrs).css(css).on('load', function () {
						deferred.resolve($content.show());
					})
					// We can't move an <iframe> and avoid reloading it,
					// so let's put it in place ourselves right now:
					.appendTo(this.$instance.find('.' + this.namespace + '-content'));
					return deferred.promise();
				}
			},
			text: {
				process: function process(text) {
					return $('<div>', { text: text });
				}
			}
		},

		functionAttributes: ['beforeOpen', 'afterOpen', 'beforeContent', 'afterContent', 'beforeClose', 'afterClose'],

		/*** class methods ***/
		/* read element's attributes starting with data-featherlight- */
		readElementConfig: function readElementConfig(element, namespace) {
			var Klass = this,
			    regexp = new RegExp('^data-' + namespace + '-(.*)'),
			    config = {};
			if (element && element.attributes) {
				$.each(element.attributes, function () {
					var match = this.name.match(regexp);
					if (match) {
						var val = this.value,
						    name = $.camelCase(match[1]);
						if ($.inArray(name, Klass.functionAttributes) >= 0) {
							/* jshint -W054 */
							val = new Function(val); /* jshint +W054 */
						} else {
							try {
								val = JSON.parse(val);
							} catch (e) {}
						}
						config[name] = val;
					}
				});
			}
			return config;
		},

		/* Used to create a Featherlight extension
     [Warning: guru-level]
     Creates the extension's prototype that in turn
     inherits Featherlight's prototype.
     Could be used to extend an extension too...
     This is pretty high level wizardy, it comes pretty much straight
     from CoffeeScript and won't teach you anything about Featherlight
     as it's not really specific to this library.
     My suggestion: move along and keep your sanity.
  */
		extend: function extend(child, defaults) {
			/* Setup class hierarchy, adapted from CoffeeScript */
			var Ctor = function Ctor() {
				this.constructor = child;
			};
			Ctor.prototype = this.prototype;
			child.prototype = new Ctor();
			child.__super__ = this.prototype;
			/* Copy class methods & attributes */
			$.extend(child, this, defaults);
			child.defaults = child.prototype;
			return child;
		},

		attach: function attach($source, $content, config) {
			var Klass = this;
			if ((typeof $content === 'undefined' ? 'undefined' : _typeof($content)) === 'object' && $content instanceof $ === false && !config) {
				config = $content;
				$content = undefined;
			}
			/* make a copy */
			config = $.extend({}, config);

			/* Only for openTrigger and namespace... */
			var namespace = config.namespace || Klass.defaults.namespace,
			    tempConfig = $.extend({}, Klass.defaults, Klass.readElementConfig($source[0], namespace), config),
			    sharedPersist;
			var handler = function handler(event) {
				var $target = $(event.currentTarget);
				/* ... since we might as well compute the config on the actual target */
				var elemConfig = $.extend({ $source: $source, $currentTarget: $target }, Klass.readElementConfig($source[0], tempConfig.namespace), Klass.readElementConfig(event.currentTarget, tempConfig.namespace), config);
				var fl = sharedPersist || $target.data('featherlight-persisted') || new Klass($content, elemConfig);
				if (fl.persist === 'shared') {
					sharedPersist = fl;
				} else if (fl.persist !== false) {
					$target.data('featherlight-persisted', fl);
				}
				if (elemConfig.$currentTarget.blur) {
					elemConfig.$currentTarget.blur(); // Otherwise 'enter' key might trigger the dialog again
				}
				fl.open(event);
			};

			$source.on(tempConfig.openTrigger + '.' + tempConfig.namespace, tempConfig.filter, handler);

			return handler;
		},

		current: function current() {
			var all = this.opened();
			return all[all.length - 1] || null;
		},

		opened: function opened() {
			var klass = this;
			pruneOpened();
			return $.grep(_opened, function (fl) {
				return fl instanceof klass;
			});
		},

		close: function close(event) {
			var cur = this.current();
			if (cur) {
				return cur.close(event);
			}
		},

		/* Does the auto binding on startup.
     Meant only to be used by Featherlight and its extensions
  */
		_onReady: function _onReady() {
			var Klass = this;
			if (Klass.autoBind) {
				/* Bind existing elements */
				$(Klass.autoBind).each(function () {
					Klass.attach($(this));
				});
				/* If a click propagates to the document level, then we have an item that was added later on */
				$(document).on('click', Klass.autoBind, function (evt) {
					if (evt.isDefaultPrevented()) {
						return;
					}
					/* Bind featherlight */
					var handler = Klass.attach($(evt.currentTarget));
					/* Dispatch event directly */
					handler(evt);
				});
			}
		},

		/* Featherlight uses the onKeyUp callback to intercept the escape key.
     Private to Featherlight.
  */
		_callbackChain: {
			onKeyUp: function onKeyUp(_super, event) {
				if (27 === event.keyCode) {
					if (this.closeOnEsc) {
						$.featherlight.close(event);
					}
					return false;
				} else {
					return _super(event);
				}
			},

			beforeOpen: function beforeOpen(_super, event) {
				// Used to disable scrolling
				$(document.documentElement).addClass('with-featherlight');

				// Remember focus:
				this._previouslyActive = document.activeElement;

				// Disable tabbing:
				// See http://stackoverflow.com/questions/1599660/which-html-elements-can-receive-focus
				this._$previouslyTabbable = $("a, input, select, textarea, iframe, button, iframe, [contentEditable=true]").not('[tabindex]').not(this.$instance.find('button'));

				this._$previouslyWithTabIndex = $('[tabindex]').not('[tabindex="-1"]');
				this._previousWithTabIndices = this._$previouslyWithTabIndex.map(function (_i, elem) {
					return $(elem).attr('tabindex');
				});

				this._$previouslyWithTabIndex.add(this._$previouslyTabbable).attr('tabindex', -1);

				if (document.activeElement.blur) {
					document.activeElement.blur();
				}
				return _super(event);
			},

			afterClose: function afterClose(_super, event) {
				var r = _super(event);
				// Restore focus
				var self = this;
				this._$previouslyTabbable.removeAttr('tabindex');
				this._$previouslyWithTabIndex.each(function (i, elem) {
					$(elem).attr('tabindex', self._previousWithTabIndices[i]);
				});
				this._previouslyActive.focus();
				// Restore scroll
				if (Featherlight.opened().length === 0) {
					$(document.documentElement).removeClass('with-featherlight');
				}
				return r;
			},

			onResize: function onResize(_super, event) {
				this.resize(this.$content.naturalWidth, this.$content.naturalHeight);
				return _super(event);
			},

			afterContent: function afterContent(_super, event) {
				var r = _super(event);
				this.$instance.find('[autofocus]:not([disabled])').focus();
				this.onResize(event);
				return r;
			}
		}
	});

	$.featherlight = Featherlight;

	/* bind jQuery elements to trigger featherlight */
	$.fn.featherlight = function ($content, config) {
		Featherlight.attach(this, $content, config);
		return this;
	};

	/* bind featherlight on ready if config autoBind is set */
	$(document).ready(function () {
		Featherlight._onReady();
	});
})(jQuery);
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

!function (t) {
  "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) && "object" == _typeof(module.exports) ? t(require("jquery")) : "function" == typeof define && define.amd ? define([], t(window.jQuery)) : t(window.jQuery);
}(function (t) {
  if (!t) return console.warn("Unslider needs jQuery");t.Unslider = function (n, e) {
    var i = this;return i._ = "unslider", i.defaults = { autoplay: !1, delay: 3e3, speed: 750, easing: "swing", keys: { prev: 37, next: 39 }, nav: !0, arrows: { prev: '<a class="' + i._ + '-arrow prev">Prev</a>', next: '<a class="' + i._ + '-arrow next">Next</a>' }, animation: "horizontal", selectors: { container: "ul:first", slides: "li" }, animateHeight: !1, activeClass: i._ + "-active", swipe: !0, swipeThreshold: .2 }, i.$context = n, i.options = {}, i.$parent = null, i.$container = null, i.$slides = null, i.$nav = null, i.$arrows = [], i.total = 0, i.current = 0, i.prefix = i._ + "-", i.eventSuffix = "." + i.prefix + ~~(2e3 * Math.random()), i.interval = [], i.init = function (n) {
      return i.options = t.extend({}, i.defaults, n), i.$container = i.$context.find(i.options.selectors.container).addClass(i.prefix + "wrap"), i.$slides = i.$container.children(i.options.selectors.slides), i.setup(), t.each(["nav", "arrows", "keys", "infinite"], function (n, e) {
        i.options[e] && i["init" + t._ucfirst(e)]();
      }), jQuery.event.special.swipe && i.options.swipe && i.initSwipe(), i.options.autoplay && i.start(), i.calculateSlides(), i.$context.trigger(i._ + ".ready"), i.animate(i.options.index || i.current, "init");
    }, i.setup = function () {
      i.$context.addClass(i.prefix + i.options.animation).wrap('<div class="' + i._ + '" />'), i.$parent = i.$context.parent("." + i._), "static" === i.$context.css("position") && i.$context.css("position", "relative"), i.$context.css("overflow", "hidden");
    }, i.calculateSlides = function () {
      if (i.$slides = i.$container.children(i.options.selectors.slides), i.total = i.$slides.length, "fade" !== i.options.animation) {
        var t = "width";"vertical" === i.options.animation && (t = "height"), i.$container.css(t, 100 * i.total + "%").addClass(i.prefix + "carousel"), i.$slides.css(t, 100 / i.total + "%");
      }
    }, i.start = function () {
      return i.interval.push(setTimeout(function () {
        i.next();
      }, i.options.delay)), i;
    }, i.stop = function () {
      for (var t; t = i.interval.pop();) {
        clearTimeout(t);
      }return i;
    }, i.initNav = function () {
      var n = t('<nav class="' + i.prefix + 'nav"><ol /></nav>');i.$slides.each(function (e) {
        var o = this.getAttribute("data-nav") || e + 1;t.isFunction(i.options.nav) && (o = i.options.nav.call(i.$slides.eq(e), e, o)), n.children("ol").append('<li data-slide="' + e + '">' + o + "</li>");
      }), i.$nav = n.insertAfter(i.$context), i.$nav.find("li").on("click" + i.eventSuffix, function () {
        var n = t(this).addClass(i.options.activeClass);n.siblings().removeClass(i.options.activeClass), i.animate(n.attr("data-slide"));
      });
    }, i.initArrows = function () {
      !0 === i.options.arrows && (i.options.arrows = i.defaults.arrows), t.each(i.options.arrows, function (n, e) {
        i.$arrows.push(t(e).insertAfter(i.$context).on("click" + i.eventSuffix, i[n]));
      });
    }, i.initKeys = function () {
      !0 === i.options.keys && (i.options.keys = i.defaults.keys), t(document).on("keyup" + i.eventSuffix, function (n) {
        t.each(i.options.keys, function (e, o) {
          n.which === o && t.isFunction(i[e]) && i[e].call(i);
        });
      });
    }, i.initSwipe = function () {
      var t = i.$slides.width();"fade" !== i.options.animation && i.$container.on({ movestart: function movestart(t) {
          if (t.distX > t.distY && t.distX < -t.distY || t.distX < t.distY && t.distX > -t.distY) return !!t.preventDefault();i.$container.css("position", "relative");
        }, move: function move(n) {
          i.$container.css("left", -100 * i.current + 100 * n.distX / t + "%");
        }, moveend: function moveend(n) {
          Math.abs(n.distX) / t > i.options.swipeThreshold ? i[n.distX < 0 ? "next" : "prev"]() : i.$container.animate({ left: -100 * i.current + "%" }, i.options.speed / 2);
        } });
    }, i.initInfinite = function () {
      var n = ["first", "last"];t.each(n, function (t, e) {
        i.$slides.push.apply(i.$slides, i.$slides.filter(':not(".' + i._ + '-clone")')[e]().clone().addClass(i._ + "-clone")["insert" + (0 === t ? "After" : "Before")](i.$slides[n[~~!t]]()));
      });
    }, i.destroyArrows = function () {
      t.each(i.$arrows, function (t, n) {
        n.remove();
      });
    }, i.destroySwipe = function () {
      i.$container.off("movestart move moveend");
    }, i.destroyKeys = function () {
      t(document).off("keyup" + i.eventSuffix);
    }, i.setIndex = function (t) {
      return t < 0 && (t = i.total - 1), i.current = Math.min(Math.max(0, t), i.total - 1), i.options.nav && i.$nav.find('[data-slide="' + i.current + '"]')._active(i.options.activeClass), i.$slides.eq(i.current)._active(i.options.activeClass), i;
    }, i.animate = function (n, e) {
      if ("first" === n && (n = 0), "last" === n && (n = i.total), isNaN(n)) return i;i.options.autoplay && i.stop().start(), i.setIndex(n), i.$context.trigger(i._ + ".change", [n, i.$slides.eq(n)]);var o = "animate" + t._ucfirst(i.options.animation);return t.isFunction(i[o]) && i[o](i.current, e), i;
    }, i.next = function () {
      var t = i.current + 1;return t >= i.total && (t = i.options.noloop && !i.options.infinite ? i.total - 1 : 0), i.animate(t, "next");
    }, i.prev = function () {
      var t = i.current - 1;return t < 0 && (t = i.options.noloop && !i.options.infinite ? 0 : i.total - 1), i.animate(t, "prev");
    }, i.animateHorizontal = function (t) {
      var n = "left";return "rtl" === i.$context.attr("dir") && (n = "right"), i.options.infinite && i.$container.css("margin-" + n, "-100%"), i.slide(n, t);
    }, i.animateVertical = function (t) {
      return i.options.animateHeight = !0, i.options.infinite && i.$container.css("margin-top", -i.$slides.outerHeight()), i.slide("top", t);
    }, i.slide = function (t, n) {
      if (i.animateHeight(n), i.options.infinite) {
        var e;n === i.total - 1 && (e = i.total - 3, n = -1), n === i.total - 2 && (e = 0, n = i.total - 2), "number" == typeof e && (i.setIndex(e), i.$context.on(i._ + ".moved", function () {
          i.current === e && i.$container.css(t, -100 * e + "%").off(i._ + ".moved");
        }));
      }var o = {};return o[t] = -100 * n + "%", i._move(i.$container, o);
    }, i.animateFade = function (t) {
      i.animateHeight(t);var n = i.$slides.eq(t).addClass(i.options.activeClass);i._move(n.siblings().removeClass(i.options.activeClass), { opacity: 0 }), i._move(n, { opacity: 1 }, !1);
    }, i.animateHeight = function (t) {
      i.options.animateHeight && i._move(i.$context, { height: i.$slides.eq(t).outerHeight() }, !1);
    }, i._move = function (t, n, e, o) {
      return !1 !== e && (e = function e() {
        i.$context.trigger(i._ + ".moved");
      }), t._move(n, o || i.options.speed, i.options.easing, e);
    }, i.init(e);
  }, t.fn._active = function (t) {
    return this.addClass(t).siblings().removeClass(t);
  }, t._ucfirst = function (t) {
    return (t + "").toLowerCase().replace(/^./, function (t) {
      return t.toUpperCase();
    });
  }, t.fn._move = function () {
    return this.stop(!0, !0), t.fn[t.fn.velocity ? "velocity" : "animate"].apply(this, arguments);
  }, t.fn.unslider = function (n) {
    return this.each(function (e, i) {
      var o = t(i);if (!(t(i).data("unslider") instanceof t.Unslider)) {
        if ("string" == typeof n && o.data("unslider")) {
          n = n.split(":");var s = o.data("unslider")[n[0]];if (t.isFunction(s)) return s.apply(o, n[1] ? n[1].split(",") : null);
        }return o.data("unslider", new t.Unslider(o, n));
      }
    });
  };
});
'use strict';

$(document).ready(function () {
  $('#burguerIcon').click(function () {
    $(this).toggleClass("is-active"), $('.mainHeader').toggleClass("is-active"), $('.mobileNav').toggleClass("is-active");
  });
});
'use strict';

$(document).ready(function () {
  $(window).scroll(function () {
    var $header = $('.mainHeader');
    var $headerTop = $(window).scrollTop();

    if ($headerTop > 1) {
      $header.addClass('is-scrolled');
    } else {
      $header.removeClass('is-scrolled');
    }
  });
});
'use strict';

(function () {
  var tshirtCollectionId = '379094994';
  var accessToken = '70713926e14ee6c0b19f901fe0e30efa';
  var domain = 'noches-de-pitcheo.myshopify.com';
  var appId = '6';

  var cart;
  var cartLineItemCount;
  var previousFocusItem;
  var collectionProductsHash;

  /* Build new ShopifyBuy client
  ============================================================ */
  var shopClient = ShopifyBuy.buildClient({ accessToken: accessToken, domain: domain, appId: appId });

  /* Fetch or create cart using Browsers LocalStorage
  ============================================================ */
  if (localStorage.getItem('lastCartId')) {
    shopClient.fetchCart(localStorage.getItem('lastCartId')).then(function (remoteCart) {
      cart = remoteCart;
      cartLineItemCount = cart.lineItems.length;
      renderCartItems();
    });
  } else {
    shopClient.createCart().then(function (newCart) {
      cart = newCart;
      localStorage.setItem('lastCartId', cart.id);
      cartLineItemCount = 0;
    });
  }

  /* Fetch products based on tshirt collection and init.
  ============================================================ */
  shopClient.fetchQueryProducts({ collection_id: tshirtCollectionId }).then(function (products) {

    // Form Hash with product.id as key for easier access.
    collectionProductsHash = products.reduce(function (map, obj) {
      map[obj.id] = obj;
      return map;
    }, {});

    return products.forEach(function (product, i) {
      createDOMProductItems(product, i);
      generateDOMProductSelector(product);
      attachOnVariantSelectListeners(product);
    });
  }).then(function () {
    updateCartTabButton();
    bindEventListeners();
  }).catch(function (errors) {
    console.log('failed request');
    console.error(errors);
  });

  /* Create DOM product list element based on product template.
  ============================================================ */
  function createDOMProductItems(product, i) {
    var productDOMTemplate = '\n      <div class="product" id="product-' + product.id + '">\n        <div class="product-title">' + product.title + '</div>\n\n        <figure class="product-image">\n          <img src="' + product.selectedVariantImage.src + '" alt="' + product.title + '">\n          <button data-product-id="' + product.id + '"\n            class="btn btn--buy js-prevent-cart-listener">\n            COMPRAR\n          </button>\n        </figure>\n\n        <div class="product-info">\n          <div class="product-variantSelector"></div>\n          <span class="product-price">' + product.selectedVariant.formattedPrice + '</span>\n        </div>\n      </div>\n    ';

    $('#product-list').append(productDOMTemplate);
  }

  /* Generate product variant element selectors.
  ============================================================ */
  function generateSelectors(product) {
    var elements = product.options.map(function (option) {
      var optionsHtml = option.values.map(function (value) {
        return '<option value="' + value + '">' + value + '</option>';
      });

      return '\n        <select class="select" name="' + option.name + '">' + optionsHtml + '</select>\n      ';
    });

    return elements;
  }

  /* Insert product variant selector into DOM.
  ============================================================ */
  function generateDOMProductSelector(product) {
    $('#product-' + product.id + ' .product-variantSelector').html(generateSelectors(product));
  }

  /* Bind Event Listeners
  ============================================================ */
  function bindEventListeners() {
    var _this = this;

    /* cart close button listener */
    $('.cart .btn--close').on('click', closeCart);

    /* click away listener to close cart */
    $(document).on('click', function (event) {
      if (!$(event.target).closest('.cart').length && !$(event.target).closest('.js-prevent-cart-listener').length) {
        closeCart();
      }
    });

    /* escape key handler */
    var ESCAPE_KEYCODE = 27;

    $(document).on('keydown', function (event) {
      if (event.which === ESCAPE_KEYCODE) {
        if (previousFocusItem) {
          $(previousFocusItem).focus();
          previousFocusItem = '';
        }

        closeCart();
      }
    });

    /* checkout button click listener */
    $('[data-js="btn-cart-checkout"]').on('click', function () {
      window.open(cart.checkoutUrl, '_self');
    });

    /* buy button click listener */
    $('.btn--buy').on('click', buyButtonClickHandler);

    /* increment quantity click listener */
    $('.cart').on('click', '.quantity-increment', function () {
      var productId = $(this).data('product-id');
      var variantId = $(this).data('variant-id');

      incrementQuantity(productId, variantId);
    });

    /* decrement quantity click listener */
    $('.cart').on('click', '.quantity-decrement', function () {
      var productId = $(this).data('product-id');
      var variantId = $(this).data('variant-id');

      decrementQuantity(productId, variantId);
    });

    /* update quantity field listener */
    $('.cart').on('keyup', '.cart-item__quantity', debounce(fieldQuantityHandler, 250));

    /* cart tab click listener */
    $('.btn--cart-tab').click(function () {
      setPreviousFocusItem(_this);
      openCart();
    });
  }

  /* Attach and control listeners onto buy button
  ============================================================ */
  function buyButtonClickHandler(event) {
    event.preventDefault();

    var attributeProductId = $(this).data('product-id');
    var product = collectionProductsHash[attributeProductId];
    var id = product.selectedVariant.id;
    var cartLineItem = findCartItemByVariantId(id);
    var quantity = cartLineItem ? cartLineItem.quantity + 1 : 1;

    addOrUpdateVariant(product.selectedVariant, quantity);
    setPreviousFocusItem(event.target);

    $('#checkout').focus();
  }

  /* Variant option change event handler.
  ============================================================ */
  function attachOnVariantSelectListeners(product) {
    var productElement = '#product-' + product.id;

    $(productElement + ' .product-variantSelector').on('change', 'select', function (event) {
      var $element = $(event.target);
      var name = $element.attr('name');
      var value = $element.val();

      product.options.filter(function (option) {
        return option.name === name;
      })[0].selected = value;

      updateVariantImage(product);
      updateVariantPrice(product);
    });
  }

  /* Update product image based on selected variant
  ============================================================ */
  function updateVariantImage(product) {
    var image = product.selectedVariantImage;
    var src = image ? image.src : ShopifyBuy.NO_IMAGE_URI;

    $('#product-' + product.id + ' .product-image').attr('src', src);
  }

  /* Update product variant price based on selected variant
  ============================================================ */
  function updateVariantPrice(product) {
    var variant = product.selectedVariant;

    $('#product-' + product.id + ' .product-price').text('$' + variant.price);
  }

  /* Update product variant quantity in cart
  ============================================================ */
  function updateQuantity(fn, productId, variantId) {
    var product = collectionProductsHash[productId];

    var variant = product.variants.filter(function (variant) {
      return variant.id === variantId;
    })[0];

    var cartLineItem = findCartItemByVariantId(variant.id);

    if (cartLineItem) {
      var quantity = fn(cartLineItem.quantity);
      updateVariantInCart(cartLineItem, quantity);
    }
  }

  /* Update product variant quantity in cart through input field
  ============================================================ */
  function fieldQuantityHandler(event) {
    var productId = parseInt($(this).closest('.cart-item').data('product-id'), 10);
    var variantId = parseInt($(this).closest('.cart-item').data('variant-id'), 10);
    var product = collectionProductsHash[productId];

    var variant = product.variants.filter(function (variant) {
      return variant.id === variantId;
    })[0];

    var cartLineItem = findCartItemByVariantId(variant.id);
    var quantity = event.target.value;

    if (cartLineItem) {
      updateVariantInCart(cartLineItem, quantity);
    }
  }

  /* Update details for item already in cart. Remove if necessary
  ============================================================ */
  function updateVariantInCart(cartLineItem, quantity) {
    var variantId = cartLineItem.variant_id;
    var cartLength = cart.lineItems.length;

    cart.updateLineItem(cartLineItem.id, quantity).then(function (updatedCart) {
      var $cartItem = $('.cart').find('.cart-item[data-variant-id="' + variantId + '"]');

      if (updatedCart.lineItems.length >= cartLength) {
        $cartItem.find('.cart-item__quantity').val(cartLineItem.quantity);
        $cartItem.find('.cart-item__price').text(formatAsMoney(cartLineItem.line_price));
      } else {
        $cartItem.addClass('js-hidden').bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function () {
          $cartItem.remove();
        });
      }

      updateCartTabButton();
      updateTotalCartPricing();

      if (updatedCart.lineItems.length < 1) {
        closeCart();
      }
    }).catch(function (errors) {
      console.log('failed');
      console.error(errors);
    });
  }

  /* Update Total Cart Pricing
  ============================================================ */
  function updateTotalCartPricing() {
    $('.cart .pricing').text(formatAsMoney(cart.subtotal));
  }

  /* Open Cart
  ============================================================ */
  function openCart() {
    $('.cart').addClass('js-active');
  }

  /* Close Cart
  ============================================================ */
  function closeCart() {
    $('.cart').removeClass('js-active');
    $('.overlay').removeClass('js-active');
  }

  /* Decrease product cart quantity amount by 1
  ============================================================ */
  function decrementQuantity(productId, variantId) {
    updateQuantity(function (quantity) {
      return quantity - 1;
    }, productId, variantId);
  }

  /* Increase product cart quantity amount by 1
  ============================================================ */
  function incrementQuantity(productId, variantId) {
    updateQuantity(function (quantity) {
      return quantity + 1;
    }, productId, variantId);
  }

  /* Find Cart Line Item By Variant Id
  ============================================================ */
  function findCartItemByVariantId(variantId) {
    return cart.lineItems.filter(function (item) {
      return item.variant_id === variantId;
    })[0];
  }

  /* Determine action for variant adding/updating/removing
  ============================================================ */
  function addOrUpdateVariant(variant, quantity) {
    openCart();

    var cartLineItem = findCartItemByVariantId(variant.id);

    if (cartLineItem) {
      updateVariantInCart(cartLineItem, quantity);
    } else {
      addVariantToCart(variant, quantity);
    }

    updateCartTabButton();
  }

  /* Add 'quantity' amount of product 'variant' to cart
  ============================================================ */
  function addVariantToCart(variant, quantity) {
    openCart();

    cart.createLineItemsFromVariants({ variant: variant, quantity: quantity }).then(function () {
      var cartItem = cart.lineItems.filter(function (item) {
        return item.variant_id === variant.id;
      })[0];

      var $cartItem = renderCartItem(cartItem);
      var $cartItemContainer = $('.cart-item-container');

      $cartItemContainer.append($cartItem);

      setTimeout(function () {
        $cartItemContainer.find('.js-hidden').removeClass('js-hidden');
      }, 0);
    }).catch(function (errors) {
      console.log('failed');
      console.error(errors);
    });

    updateTotalCartPricing();
    updateCartTabButton();
  }

  /* Return required markup for single item rendering
  ============================================================ */
  function renderCartItem(lineItem) {
    var lineItemEmptyTemplate = $('#CartItemTemplate').html();
    var $lineItemTemplate = $(lineItemEmptyTemplate);
    var itemImage = lineItem.image.src;
    var variantId = lineItem.variant_id;
    var productId = lineItem.product_id;

    $lineItemTemplate.attr('data-product-id', productId);
    $lineItemTemplate.attr('data-variant-id', variantId);
    $lineItemTemplate.addClass('js-hidden');
    $lineItemTemplate.find('.cart-item__img').css('background-image', 'url(' + itemImage + ')');
    $lineItemTemplate.find('.cart-item__title').text(lineItem.title);
    $lineItemTemplate.find('.cart-item__variant-title').text(lineItem.variant_title);
    $lineItemTemplate.find('.cart-item__price').text(formatAsMoney(lineItem.line_price));
    $lineItemTemplate.find('.cart-item__quantity').attr('value', lineItem.quantity);

    $lineItemTemplate.find('.quantity-decrement').attr({
      'data-variant-id': variantId,
      'data-product-id': productId
    });

    $lineItemTemplate.find('.quantity-increment').attr({
      'data-variant-id': variantId,
      'data-product-id': productId
    });

    return $lineItemTemplate;
  }

  /* Render the line items currently in the cart
  ============================================================ */
  function renderCartItems() {
    var $cartItemContainer = $('.cart-item-container');

    $cartItemContainer.empty();

    //let lineItemEmptyTemplate = $('#CartItemTemplate').html();

    var $cartLineItems = cart.lineItems.map(function (lineItem, index) {
      return renderCartItem(lineItem);
    });

    $cartItemContainer.append($cartLineItems);

    setTimeout(function () {
      $cartItemContainer.find('.js-hidden').removeClass('js-hidden');
    }, 0);

    updateTotalCartPricing();
  }

  /* Format amount as currency
  ============================================================ */
  function formatAsMoney(amount, currency, thousandSeparator, decimalSeparator, localeDecimalSeparator) {
    currency = currency || '$';
    thousandSeparator = thousandSeparator || ',';
    decimalSeparator = decimalSeparator || '.';
    localeDecimalSeparator = localeDecimalSeparator || '.';

    var regex = new RegExp('(\\d)(?=(\\d{3})+\\.)', 'g');

    return currency + parseFloat(amount, 10).toFixed(2).replace(localeDecimalSeparator, decimalSeparator).replace(regex, '$1' + thousandSeparator).toString();
  }

  /* Update cart tab button
  ============================================================ */
  function updateCartTabButton() {
    if (cart.lineItems.length > 0) {
      $('.btn--cart-tab .btn__counter').html(cart.lineItemCount);
      $('.btn--cart-tab').addClass('js-active');
    } else {
      $('.btn--cart-tab').removeClass('js-active');
      $('.cart').removeClass('js-active');
    }
  }

  /* Set previously focused item for escape handler
  ============================================================ */
  function setPreviousFocusItem(item) {
    previousFocusItem = item;
  }

  /* Debounce taken from _.js (http://underscorejs.org/#debounce)
  ============================================================ */
  function debounce(func, wait, immediate) {
    var timeout = void 0;

    return function () {
      var context = this;
      var args = arguments;

      var later = function later() {
        timeout = null;

        if (!immediate) func.apply(context, args);
      };

      var callNow = immediate && !timeout;

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func.apply(context, args);
    };
  }
});
'use strict';

function startSlider() {
  $('.mySlider').unslider({
    nav: true,
    speed: 400,
    infinite: true
  });
}