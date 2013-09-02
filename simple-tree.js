/**
* jQuery Simple Tree
* https://github.com/dudiq/simple-tree
*
* @version: 0.8 - 2013.08.27
* @author: dudiq
* @licence: MIT http://www.opensource.org/licenses/mit-license.php
*
**/

define(function (require) {

    var $ = require('jquery');

    var gPlugins = {};

    var isMobile = new RegExp("mobile", "i").test(navigator.userAgent),
        start_ev = ((isMobile) ? "touchstart" : "mousedown"),
        move_ev = ((isMobile) ? "touchmove" : "mousemove"),
        end_ev = ((isMobile) ? "touchend" : "click");

    var SELECTED_NODES_ID = "selectedNodesId";
    var SELECTED_ONE_NODE_ID = "selectedNodeId";
    
        //private methods
    function log(msg){
        if (console)
            console.log(msg);
    }
    
    function showError(msg){
        if (console)
            console.error(msg);
    }

    function clone(data){
        return (jQuery.extend(true, {}, {val: data})).val;
    }

    var safeTextBuff = $("<div/>");

    function getEscapedText(text){
        text = text || "";
        return safeTextBuff.text(text).html();
    }

    function getNewNodePos(parentId, newData){
        var pNode = this.getNode(parentId),
            nodes = pNode.nodes,
            pos,
            compare,
            decVal = 0,
            tmpNodes = [];
        //create temp array for get right position
        if (nodes){
            for (var i = 0, l = nodes.length; i < l; i++){
                if (nodes[i].id == newData.id){
                    decVal = -1;
                }
                compare = compareItems(nodes[i], newData);
                if (compare == 1){
                    pos = i;
                    break;
                }
            }
            if (!isNaN(pos)){
                pos += decVal;
            } else {
                //if pos is NaN, position is last, and no need to set
                pos = nodes.length;
            }
        }
        return pos;
    }

    function compareItems(a, b){
        var aTitle = (a.title + "").toLowerCase();
        var bTitle = (b.title + "").toLowerCase();
        var ret = (aTitle == bTitle) ? 0 : (aTitle < bTitle) ? -1 : 1;

        (a.nodes && !b.nodes) && (ret = -1);
        (!a.nodes && b.nodes) && (ret = 1);
        return ret;
    }

    function sortNodes(data){
        data.sort(compareItems);
    }

    function setMarginToRoot(val, div){
        if (val){
            div.addClass("simple-tree-item-root");
        } else {
            div.removeClass("simple-tree-item-root");
        }

    }

    function getTouchEvent(ev){
        var e;
        if (ev.originalEvent.touches && ev.originalEvent.touches.length) {
            e = ev.originalEvent.touches[0];
        } else if (ev.originalEvent.changedTouches && ev.originalEvent.changedTouches.length) {
            e = ev.originalEvent.changedTouches[0];
        } else {
            e = ev;
        }
        return e;
    }

    function isCtrlPressed(ev){
        return (ev) ? ev.ctrlKey || ev.metaKey: false;
    }

    function isShiftPressed(ev){
        return (ev) ? ev.shiftKey : false;
    }

    function trig(name){
        var options = this._opt;
        var res;
        if (options[name] && typeof options[name] == "function"){
            var args = Array.prototype.slice.call(arguments, 0);
            args.splice(0, 1);//remove name argument
            res = options[name].apply(this, args);
        }
        return res;
    }

    function selectionChanged(){
        var env = this._treeEnv;
        var toCompare = {
            nodes: env[SELECTED_NODES_ID],
            node: env[SELECTED_ONE_NODE_ID]
        };

        var ret = (JSON.stringify(toCompare) == JSON.stringify(env['rememberSelected']));

        if (!ret){
            var oldSelected = env['rememberSelected'] && env['rememberSelected'].nodes;
            var newSelected = env[SELECTED_NODES_ID];
            trig.call(this, "onSelectionChanged", newSelected, oldSelected);
        }

        toCompare = null;
    }

    function rememberSelection(){
        var env = this._treeEnv;
        env['rememberSelected'] = {
            nodes: clone(env[SELECTED_NODES_ID]),
            node: clone(env[SELECTED_ONE_NODE_ID])
        }
    }
    
    //basic
    function jqSimpleTree(div, data, opt) {

        var tree = {
            _data: null,
            _div: null, //render container
            _nodesMap: null, // map of nodes by ID of node
            _opt: null, // options linked to plugin options by plugin name
            _plugins: null,
            _treeEnv: null, //enviropment for tree, (selected node id for example, etc...)
            _id: null,
            _init: function(div, data, opt) {
                if ($(div[0]) == undefined){
                    showError("Error :: There are undefined HTML Container for draw tree");
                    return;
                }
                var self = this;
                this._id = "w" + this._generateUniqueId();
                this._div = $("<div class='simple-tree' id='" + this._id + "'>").attr("unselectable", "on");
                this._setGetTree();
                this._plugins = {}; this._treeEnv = {}; this._opt = (typeof opt == "object") ? opt : {};
                this._dropData();
                this.enable(this._opt['enable']);
                tree._initPlugins();
                this.setData(data);
                div.append(this._div);
                this.indent(this._opt['indent']);
                this._bindEvents();
            },
            _initPlugins: function(){
                var plugins = (this._opt['plugins']) ? this._opt['plugins'] : {};
                for (var name in gPlugins){
                    var tPlug = gPlugins[name];
                    if (plugins[name]){
                        var plug = new tPlug(this, plugins[name]);
                        this._plugins[name] = plug;
                    }
                }
            },
            destroyPlugins: function(){
                var plugs = this._plugins;
                for (var key in plugs){
                    plugs[key].destroy();
                    delete plugs[key];
                }
            },
            id: function(){return this._id;},
            setData: function(data) {
                if (data != undefined) {
                    this.clear();
                    var treeData = ($.isArray(data)) ? {hideNodeTitle: true, nodes: data} : data;
                    //treeData = this._opt['sort'] ? this.sort(treeData): treeData;
                    if (this._addNewNode({data: treeData, buff: this._div, sort: this._opt['sort']})){
                        this._data = data;
                        var rootNode = this.getRootNode();
                        var rootSys = this._getNodesMap(rootNode.id);
                        setMarginToRoot(rootNode.hideNodeTitle, rootSys.nodesContainer);
                    }
                }
            },
            getData: function(){
                return clone(this._data);
            },
            getDataLink: function(){
                return this._data;
            },
            base: function(){
                return this._div;
            },
            width: function(){
                var w = 0;
                this._div.children().each(function(ind, el){
                    var elW = ($(el).is(":visible")) ? $(el).width() : 0;
                    w = (w < elW) ? elW : w;
                });
                return w;
            },
            height: function(){
                var h = 0;
                this._div.children().each(function(ind, el){
                    h += ($(el).is(":visible")) ? $(el).outerHeight() - 0 : 0;
                });
                return h;
            },
            getTouchEvent: getTouchEvent,
            getSortedPosition: function(node){
                node = ($.isPlainObject(node)) ? node : this.getNode(node);
                var pNodeId = this.getParentNodeId(node.id);
                return getNewNodePos.call(this, pNodeId, node);
            },
            getLineHeight: function(){
                var line = this._createLine({title:"&nbsp;"}),
                    div = $("<div/>"),
                    height = 0,
                    buff = line.itemDiv;
                div.css({position: "absolute", left: -500, top:-500});
                div.append(buff);
                this._div.append(div);
                height = buff.height();
                div.remove();
                return height;
            },
            reDraw: function(){
                this._setGetTree();
                this.setData(this._data);
                var plugs = this._plugins;
                for (var i in plugs){
                    if (typeof plugs[i]['reDraw'] == "function")
                    plugs[i].reDraw();
                }
                this._bindEvents();
            },
            _setGetTree: function(){
                var self = this;
                this._div.data("getTree", function(){
                    return self;
                });
            },
            clear: function(){
                this._div.empty();
                this._dropData();
            },
            setItemIcon: function(id, iconUrl){
                var map = this._getNodesMap(id);
                if (map){
                    var icon = $(map.divs[0]).find(".simple-tree-item-icon");
                    if (icon.length > 0 && (icon[0].tagName).toLowerCase() == "span"){
                        var classAttr = icon.attr("class"), styleAttr = icon.attr("style");
                        var newIcon = $("<img class='" + classAttr + "' style='"+ styleAttr +"'>");
                        icon.replaceWith(newIcon);
                        icon = newIcon;
                    }
                    icon.attr("src", iconUrl);
                }
            },
            setItemIconSize: function(size){
                size = parseInt(size, 10);
                var env = this._treeEnv;
                (env['iconStyle']) && env['iconStyle'].remove();

                if (!isNaN(size)){
                    var div = this._div,
                        className = "simple-tree-item-icon";
                    if (size > 50 || size < 0){
                        size = size + "px";
                        env['iconStyle'] = $("<style> #" + this._id + " ." + className + " {width: " + size + "; height: " + size + ";} </style>");
                        div.parent().prepend(env['iconStyle']);
                    } else {
                        var oldValue = div.data("simple-tree-item-icon-value");
                        oldValue && div.removeClass(className + oldValue);
                        div.addClass(className + size);
                        div.data("simple-tree-item-icon-value", size);
                    }
                }
            },
            option: function(opt, key, val){
                if (val == undefined && this._plugins[opt] == undefined){
                    return (key == undefined) ? this._opt[opt] : (typeof this[opt] == "function") ? this[opt](key) : this._opt[opt] = key;
                } else {
                    //plugin callback
                    return this._plugins[opt][key](val);
                }
            },
            _dropData: function(){
                this._treeEnv = {}; this._nodesMap = {}; this._data = {};
            },
            _createLine: function(node){
                var isFolder = (node.nodes != undefined),
                    isClosed = (node.closed === true && isFolder),
                    cssClass = (node.cssClass) ? node.cssClass : "",
                    bungClass = (node.bungClass) ? node.bungClass : "",
                    subIconClass = (node.subIconClass) ? node.subIconClass : "",
                    title = (node.safeTitle !== false) ? getEscapedText(node.title || "")  : (node.title || ""),
                    alt = (node.alt) ? " title='" + node.alt +"' ": "",
                    hasChild = (isFolder && node.nodes.length > 0),
                    iconSizeStyle = (node.iconSize != undefined) ? "height:" + node.iconSize + "px; width:" + node.iconSize + "px;" : "",
                    itemDiv = $("<table class='simple-tree-item "+((isFolder) ? "simple-tree-folder" : "simple-tree-child") + " " + cssClass + "'><tr>" +
                        "<td><span class='simple-tree-expand "+((!hasChild) ? "simple-tree-no-child" : "" )+ " " + ((isClosed) ? "simple-tree-close": "") + "'>&nbsp;</span></td>"+
                        "<td>" + ((node.icon != undefined) ? "<img src='"+ node.icon + "' class='simple-tree-item-icon' style='" + iconSizeStyle + "'>"
                        : "<span class='simple-tree-item-icon'>&nbsp;</span>") + "<span class='simple-tree-item-sub-icon " + subIconClass + "'>&nbsp;</span></td>"+
                        "<td><span class='simple-tree-title' "+ alt +">" + title + "</span></td><td class='simple-tree-last-td'><span class='simple-tree-bung " + bungClass + "'>&nbsp;</span></td></tr></table>"),
                    ul = (isFolder) ? this._getNewContainerEl(node.id) : undefined;

                this._opt["showTitle"] && itemDiv.attr("title", title);

                (isClosed && ul) ? ul.hide() : null;
                if (node.hideNodeTitle === true) {
                    itemDiv.hide();
                }
                itemDiv.data({
                    "id": node.id
                });
                node.userData = (node.userData == undefined) ? {} : node.userData;
                return {itemDiv: itemDiv, ul: ul};
            },
            _addNewNode: function(params){
                var parentId = params.parentId,
                    data = params.data,
                    buff = params.buff,
                    sort = params.sort,//sort only from setData, when inserting new node, getting only position
                    pos = params.pos;

                if (!buff){
                    showError('Error :: append HTML element to undefined container');
                    return;
                }
                var tmpDiv = $("<div>"); tmpDiv.data("id", parentId);
                var nodesMap = this._nodesMap,
                    newLine,
                    canAdd = true,
                    self = this;

                function createNewMapItem(node, divs, nodesContainer, parentId, bung){
                    var struct = {
                        node: node,
                        divs: divs,
                        nodesContainer: nodesContainer,
                        parentId: parentId,
                        bung: bung
                    };
                    return struct;
                }

                this._traverseNodes(data, function(node, pdiv, level) {
                    if (sort && node.nodes){
                        sortNodes(node.nodes);
                    }
                    //create node and return $("<ul>") element if node has children
                    node.id = (node.id == undefined) ? self._generateUniqueId(nodesMap) : node.id;
                    if (nodesMap[node.id] != undefined){
                        showError("Error :: Detects duplicate ID in data");
                        canAdd = false;
                        return false;
                    } else {
                        newLine = self._createLine(node);
                        nodesMap[node.id] = createNewMapItem(node, newLine.itemDiv, newLine.ul, pdiv.data("id"), {});
                        pdiv.append(newLine.itemDiv, newLine.ul);
                    }
                    return newLine.ul;
                }, {div: tmpDiv});
                if (canAdd){
                    if (pos != undefined && pos != -1){
                        var sysStruct = this._getNodesMap(parentId);
                        if (sysStruct.node.nodes.length > pos) {
                            var posNode = this._getNodesMap(sysStruct.node.nodes[pos].id);
                            posNode.divs.before(tmpDiv.children());
                        } else {
                            buff.append(tmpDiv.children());
                        }
                    } else{
                        buff.append(tmpDiv.children());
                    }
                }
                return canAdd;
            },
            _getNewContainerEl: function(id){
                //return html container for children
                return $("<div class='simple-tree-container'>").data("id", id);
            },
            _generateUniqueId: function(map){
                function getGuid(){
                    var quidStr = "abcdefghijklmnopqrstuvwxyz0123456789-", quid = "";
                    for (var i = 0, l = quidStr.length; i < l; i++) {
                        var pos = parseInt(l * Math.random());
                        quid += quidStr.charAt(pos);
                    }
                    return quid;
                }
                var uid;
                while ((map && map[uid]) || !uid) {
                    uid = getGuid();
                }
                return uid;
            },
            traverseNodes: function(node, callback, opt){
                this._traverseNodes(node, callback, opt);
            },
            _traverseNodes: function(node, callback, opt, level) {
                opt = (opt) ? opt : {};
                var list = node['nodes'], pDiv,
                    div = opt.div,
                    level = level || 0,
                    params,
                    self = this,
                    reverse = opt.reverse;


                if ($.isArray(node)) {
                    list = node;
                    pDiv = div;
                } else {
                    pDiv = callback.call(this, node, div, level);
                    var callTraverseOpt = opt.callTraverse;
                    delete opt['callTraverse'];
                    if (callTraverseOpt === false){
                        //drop calling traverse only for parent node
                        list = undefined;
                    }
                }
                if (list != undefined && pDiv !== false) {
                    var i = 0, l = list.length;
                    function callTraverse(){
                        params = opt;
                        params.div = pDiv;
                        level++;
                        return self._traverseNodes(list[i], callback, params, level);
                    }

                    if (reverse){
                        for (i = list.length - 1; i >= 0; i--){
                            //walk by reverse
                            if (callTraverse() === false){
                                pDiv = false;
                                //drop traverse
                                break;
                            }
                        }
                    } else {
                        for (i = 0, l = list.length; i < l; i++){
                            //walk by default
                            if (callTraverse() === false){
                                pDiv = false;
                                //drop traverse
                                break;
                            }
                        }
                    }
                }
                return pDiv;
            },
            getRootNode: function(){
                var data = this._data,
                    ret,
                    node = ($.isArray(data)) ? data[0] : data;
                if (node['id'] != undefined){
                    ret = node;
                    this._traverseParents(node.id, function(node){
                        ret = node;
                    })
                }
                return ret;
            },
            _traverseParents: function(nodeId, callback){
                var parent = this.getParentNode(nodeId);
                if (parent != undefined && callback(parent) != false){
                    this._traverseParents(parent['id'], callback);
                }
            },
            traverseParents: function(){
                this._traverseParents.apply(this, arguments);
            },
            _getContainerForNodes: function(id){
                return this._getNodesMap(id).nodesContainer;
            },
            _getNodesMap: function(id){
                return this._nodesMap[id];
            },
            redrawNode: function(id){
                var parent = this.getParentNode(id);
                var node = this.getNode(id);
                for (var i = 0, l = parent.nodes.length; i < l; i ++){
                    if (parent.nodes[i].id == id){
                        break;
                    }
                }
                this.removeNode(id);
                this.addNode(parent.id, node, i);
            },

            addNode: function(parentId, newData, pos){//data = {title: "node", id: "", nodes: [etc...]}
                //for newData == array, ignored pos argument :todo see pos when add new array of items
                var sysStruct = this._getNodesMap(parentId);
                if (!sysStruct){
                    showError('Error :: Wrong parent ID');
                    return;
                }

                if (this._opt['sort'] && pos === undefined){
                    pos = getNewNodePos.call(this, parentId, newData);
                }

                var data = sysStruct.node;
                var parentEls = sysStruct.divs;
                if (data.nodes == undefined || data.nodes.length == 0){
                    //append container for nodes
                    data.nodes = [];
                    $(parentEls[0]).addClass("simple-tree-folder").removeClass("simple-tree-child");
                    sysStruct.nodesContainer = (sysStruct.nodesContainer) ? sysStruct.nodesContainer : this._getNewContainerEl(parentId);
                    $(parentEls[parentEls.length - 1]).after(sysStruct.nodesContainer);
                }
                if (this.getRootNode() == data){
                    setMarginToRoot(data.hideNodeTitle, sysStruct.nodesContainer);
                }
                if (this._addNewNode({parentId: parentId, data:newData, buff: sysStruct.nodesContainer, pos: pos})){
                    if ($.isArray(newData)){
                        if (newData.length > 0){
                            data.nodes = data.nodes.concat(newData);
                        }
                    } else {
                        (pos != undefined && pos != -1) ? data.nodes.splice(pos, 0, newData)
                                           : data.nodes.push(newData);
                    }
                    if (data.nodes.length > 0)
                        $(parentEls[0]).find(".simple-tree-expand").removeClass("simple-tree-no-child");

                    return true;
                }
                return false;
            },
            moveNodeByPos: function(node, parentId, pos, source){
                source = (source) ? source : this;
                parentId = (parentId === undefined) ? source.getParentNodeId(node.id) : parentId;
                source.removeNode(node.id);
                return this.addNode(parentId, node, pos);
            },
            getNodePos: function(id){
                var pNode = this.getParentNode(id),
                    ret;
                if (pNode){
                    for (var i = 0, l = pNode.nodes.length; i < l; i ++){
                        if (pNode.nodes[i].id == id){
                            ret = i;
                            break;
                        }
                    }
                }
                return ret;
            },
            removeNode: function(id){
                rememberSelection.call(this);
                var sysStruct = this._getNodesMap(id),
                    self = this;
                if (!sysStruct){
                    showError('Error :: There are no ID in tree');
                    return;
                }
                $(sysStruct.nodesContainer).remove().empty();
                sysStruct.divs.remove().empty();
                //check for roots nodes
                var notRoot = (sysStruct.parentId != undefined),
                    isItem;
                if (notRoot){
                    //clear data from parent
                    var parentStruct = this._getNodesMap(sysStruct.parentId);
                    var children = parentStruct.node.nodes;
                    for (var i = 0, l = children.length; i < l; i++){
                        if (children[i].id == id){
                            self.clearSelection(id);
                            this._traverseNodes(children[i], function(cNode){
                                self.clearSelection(cNode.id);
                                delete self._nodesMap[cNode.id];
                            });
                            children.splice(i, 1);
                            break;
                        }
                    }
                    if (children.length == 0){
                        $(parentStruct.divs[0]).find(".simple-tree-expand").addClass("simple-tree-no-child");
                        parentStruct.nodesContainer.empty().remove();
                        parentStruct.nodesContainer = undefined;
                    }
                } else {
                    //for root node
                    this._dropData();
                }
                selectionChanged.call(this);                
            },
            removeChildren: function(id){
                var map = this._getNodesMap(id);
                if (map && map.node.nodes != undefined && map.node.nodes.length > 0){
                    var i = map.node.nodes.length - 1;
                    while (i >= 0){
                        this.removeNode(map.node.nodes[i].id);
                        i--;
                    }
                }
            },
            removeNodes: function(nodes){
                //nodes - array of ids
                if ($.isArray(nodes)){
                    for (var i = 0, l = nodes.length; i < l; i++){
                        var id = $.isPlainObject(nodes[i]) ? nodes[i].id : nodes[i];
                        this.removeNode(id);
                    }
                }
            },
            getChildren: function(id){
                var map = this._getNodesMap(id);
                if (map && map.node.nodes != undefined){
                    return map.node.nodes;
                }
            },
            closeNode: function(id, callEvent){
                var map = this._getNodesMap(id);
                if (map != undefined){
                    this._expandCollapseNode(map.divs.find(".simple-tree-expand"), false, callEvent);
                }
            },
            openNode: function(id, callEvent){
                var map = this._getNodesMap(id);
                if (map != undefined){
                    this._expandCollapseNode(map.divs.find(".simple-tree-expand"), true, callEvent);
                }
            },
            expandCollapseNode: function(id, callEvent){
                var map = this._getNodesMap(id);
                if (map != undefined){
                    this._expandCollapseNode(map.divs.find(".simple-tree-expand"), undefined, callEvent);
                }
            },
            _expandCollapseNode: function(el, expand, callEvent){
                var parentEl = this._getParentItemElement(el),
                    id = parentEl.data("id"),
                    node = this.getNode(id),
                    nodeContainer = this._getContainerForNodes(id);
                callEvent = (callEvent !== false && this.enable()) ? true : callEvent;
                expand = (expand != undefined) ? expand : el.hasClass("simple-tree-close");
                if (expand){
                    el.removeClass("simple-tree-close");
                    (nodeContainer) ? nodeContainer.show() : null;
                    node.closed = false;
                    if (callEvent){
                        //$(tree).trigger(jqSimpleTree.onExpandNode, [id]);
                        trig.call(this, "onExpandNode", id);
                    }
                } else {
                    el.addClass("simple-tree-close");
                    (nodeContainer) ? nodeContainer.hide() : null;
                    node.closed = true;
                    if (callEvent){
                        //$(tree).trigger(jqSimpleTree.onCollapseNode, [id]);
                        trig.call(this, "onCollapseNode", id);
                    }
                }
            },
            _getEventElem: function(ev){
                return $((ev.originalEvent.target || ev.originalEvent.srcElement));
            },
            _getParentItemElement: function(el){
                return el.closest(".simple-tree-item");
            },
            _bindEvents: function(){
                var self = this,
                    canCallEndEv = false,
                    div = this._div;


                //bind events to root div. we don't need to bind events to every child
                this._div.unbind(".simpleTree")
                .bind(start_ev + ".simpleTree", function(ev){
                    canCallEndEv = true;
                    if (self.enable()){
                        var el = self._getEventElem(ev),
                            parentEl = self._getParentItemElement(el),
                            isExpandClick = el.hasClass("simple-tree-expand");
                        if (!isExpandClick && parentEl != null && parentEl.length !=0){
                            //$(tree).trigger(jqSimpleTree.onMouseDown, [parentEl.data("id"), el]);
                            trig.call(self, "onMouseDown", parentEl.data("id"), el);
                        }
                    }
                }).bind(end_ev + ".simpleTree", function(ev){
                    if (canCallEndEv && self.enable()){
                        var el = self._getEventElem(ev),
                            parentEl = self._getParentItemElement(el),
                            isExpandClick = el.hasClass("simple-tree-expand");
                        if (isExpandClick && !el.hasClass("simple-tree-no-child") && parentEl.hasClass("simple-tree-folder")){
                            self._expandCollapseNode(el);
                        }
                        if (!isExpandClick && parentEl && parentEl.length !=0){
                            self._onSelect(parentEl, true, isCtrlPressed(ev), isShiftPressed(ev));
                            var itemId = parentEl.data("id");
                            if (el.hasClass('simple-tree-bung')) {
                                var map = self._getNodesMap(itemId);
                                if (map.bung && map.bung.action){
                                    map.bung.action();
                                }
                            } else {
                                //jQuery events will be deprecated
                                //$(tree).trigger(jqSimpleTree.onClick, [itemId, el, parentEl, isCtrlPressed(ev), isShiftPressed(ev)]);
                                trig.call(self, "onClick", itemId, el, parentEl, isCtrlPressed(ev), isShiftPressed(ev));
                            }
                        }
                    }
                }).bind("dblclick.simpleTree", function(ev){
                    if (self.enable()){
                        var el = self._getEventElem(ev),
                            parentEl = self._getParentItemElement(el),
                            isExpandClick = el.hasClass("simple-tree-expand");
                        if (!isExpandClick && parentEl != null && parentEl.length !=0){
                            //$(tree).trigger(jqSimpleTree.onDblClick, [parentEl.data("id"), el]);
                            trig.call(self, "onDblClick", parentEl.data("id"), el);
                        }
                    }
                }).bind("mouseover.simpleTree", function(ev){
                    if (self.enable()){
                        var el = self._getEventElem(ev);
                        if (el.hasClass("simple-tree-title")) {
                            var clickEl = self._getParentItemElement(el);
                            //$(tree).trigger(jqSimpleTree.onMouseOver, [clickEl.data("id")]);
                            trig.call(self, "onMouseOver", clickEl.data("id"));
                        }
                    }
                }).bind("mouseout.simpleTree", function(ev){
                    if (self.enable()){
                        var el = self._getEventElem(ev);
                        if (el.hasClass("simple-tree-title")) {
                            var clickEl = self._getParentItemElement(el);
                            //$(tree).trigger(jqSimpleTree.onMouseOut, [clickEl.data("id")]);
                            trig.call(self, "onMouseOut", clickEl.data("id"));
                        }
                    }
                }).bind(move_ev + ".simpleTree", function(){
                    canCallEndEv = false;
                });

            },
            _setSelectedStyleToEl: function(el){
                var selCss = "simple-tree-item-selected",
                    titleCss = ".simple-tree-title",
                    selColor = this.selectedColor(),
                    selBorder = this.selectedBorder();
                el.addClass(selCss);
                selColor && el.find(titleCss).css("background-color", selColor);
                selBorder && el.find(titleCss).css("border", selBorder);
            },
            _removeSelectedStyleToEl: function(el){
                var selCss = "simple-tree-item-selected";
                el.removeClass(selCss).find(".simple-tree-title").css({border:"", "background-color":""});
            },
            _collectNodesByShiftKey: function(startId, endId){
                var self = this,
                    env = this._treeEnv,
                    firstNode = this._getNodesMap(startId),
                    endNode = this._getNodesMap(endId),
                    selNodes = env[SELECTED_NODES_ID] || [];

                if ((firstNode.divs.offset().top > endNode.divs.offset().top)){
                    var tmp = firstNode;
                    firstNode = endNode;
                    endNode = tmp;
                    tmp = null;
                }

                firstNode = firstNode.node.id;
                endNode = endNode.node.id;

                var collectIds = [];
                var canPush = false;
                var opt = {};
                this._traverseNodes(this.getRootNode(), function(node){
                    if (node.id == firstNode){
                        canPush = true;
                    }

                    if (canPush){
                        canPush && collectIds.push(node.id);
                        if (node.closed){
                            opt.callTraverse = false;
                        }
                    }



                    if (node.id == endNode){
                        return false;
                    }
                }, opt);

                // deselect old nodes
                var i, l;
                for (i = 0, l = selNodes.length; i < l; i++){
                    this._removeSelectedStyleToEl(this._getNodesMap(selNodes[i]).divs);
                }

                //select new nodes
                for (i = 0, l = collectIds.length; i < l; i++){
                    this._setSelectedStyleToEl(this._getNodesMap(collectIds[i]).divs);
                }
                
                env[SELECTED_NODES_ID] = collectIds;

            },            
            _onSelect: function(el, callEvent, ctrlPressed, shiftPressed){
                if (!this.enable()) return;
                rememberSelection.call(this);
                var env = this._treeEnv;
                (!env[SELECTED_NODES_ID]) ? env[SELECTED_NODES_ID] = [] : null;
                var self = this,
                    selCss = "simple-tree-item-selected",
                    oldSelId = env[SELECTED_ONE_NODE_ID],
                    selNodes = env[SELECTED_NODES_ID],
                    selId = env[SELECTED_ONE_NODE_ID] = el.data("id");

                if (this.multiSelect() && (ctrlPressed || shiftPressed)){
                    if (ctrlPressed){
                        //multi click
                        if (el.hasClass("simple-tree-item-selected")){
                            for (var i = 0, l = selNodes.length; i < l; i++){
                                if (selNodes[i] == selId){
                                    selNodes.splice(i, 1);
                                    break;
                                }
                            }
                            this._removeSelectedStyleToEl(el);
                        } else {
                            selNodes.push(selId);
                            this._setSelectedStyleToEl(el);
                        }
                    }

                    if (shiftPressed){
                        this._collectNodesByShiftKey(env.shiftSelectedId || oldSelId, selId);
                    } else {
                        env.shiftSelectedId = selId;
                    }                   
                } else {
                    //single click
                    env.shiftSelectedId = selId;
                    env[SELECTED_NODES_ID] = [selId];
                    this._div.find("table."+selCss).each(function(){
                        self._removeSelectedStyleToEl($(this));
                    });
                    this._setSelectedStyleToEl(el);
                }
                if (callEvent !== false){
                    //$(tree).trigger(jqSimpleTree.onSelect, [selId, oldSelId]);
                    trig.call(self, "onSelect", selId, oldSelId);
                }
                selectionChanged.call(this);
            },
            updateSelection: function(ids){
                var self = this;
                function update(id){
                    var env = self._treeEnv,
                        selCss = "simple-tree-item-selected",
                        selNodes = env[SELECTED_NODES_ID],
                        selNode,
                        node;
                    (id != undefined) ? node = self._getNodesMap(id) : node = self._getNodesMap(env[SELECTED_ONE_NODE_ID]);
                    (node) ? self._setSelectedStyleToEl(node['divs']) : null;

                    if ($.isArray(selNodes)){
                        for (var i = 0, l = selNodes.length; i < l; i++){
                            if (id == undefined || selNodes[i] == id){
                                selNode = self._getNodesMap(selNodes[i]);
                                (selNode) ? self._setSelectedStyleToEl(selNode['divs']) : null;
                            }
                        }
                    }
                }
                if ($.isArray(ids)){
                    for (var i = 0, l = ids.length; i < l; i++){
                        update(ids[i]);
                    }
                } else {
                    update(ids);
                }
            },
            clearSelection: function(id){
                if ($.isArray(id)){
                    for (var i = 0, l = id.length; i < l; i++){
                        this._clearSelection(id[i]);
                    }
                } else {
                    this._clearSelection(id);
                }
            },
            _clearSelection: function(id){
                var env = this._treeEnv,
                    selCss = "simple-tree-item-selected",
                    selNodes = env[SELECTED_NODES_ID],
                    selNode,
                    node;
                (id != undefined) ? node = this._getNodesMap(id) : node = this._getNodesMap(env[SELECTED_ONE_NODE_ID]);
                if (node) {
                    this._removeSelectedStyleToEl(node['divs']);
                    env[SELECTED_ONE_NODE_ID] = undefined;
                }

                if ($.isArray(selNodes)){
                    for (var i = selNodes.length - 1, l = 0; i >= l; i--){
                        if (id == undefined || selNodes[i] == id){
                            selNode = this._getNodesMap(selNodes[i]);
                            if (selNode) {
                                this._removeSelectedStyleToEl(selNode['divs']);
                                selNodes.splice(i, 1);
                            }
                        }
                    }
                }
            },
            getSelectedNodes: function(){
                var selNodes = this._treeEnv[SELECTED_NODES_ID],
                    node,
                    ret = [];
                if (selNodes){
                    for (var i = 0, l = selNodes.length; i < l; i++){
                        node = this.getNode(selNodes[i]);
                        if (node){
                            ret.push(node);
                        } else {
                            ret = [];
                            break;
                        }
                    }
                }
                return ret;
            },
            getSelectedNodesId: function(){
                var ret = this._treeEnv[SELECTED_NODES_ID];
                return (ret == undefined) ? [] : ret;
            },
            getSelectedNode: function(){
                return this.getNode(this._treeEnv[SELECTED_ONE_NODE_ID]);
            },
            getSelectedNodeId: function(){
                var selNode = this.getSelectedNode();
                return (selNode == undefined) ? undefined : selNode.id;
            },
            selectNodes: function(nodes, callEvent){
                //nodes can be array of nodes, or array of ids
                if ($.isArray(nodes) && nodes.length != 0){
                    var isPlain = $.isPlainObject(nodes[0]);
                    var self = this;

                    function selectNode(node, ctrlPress){
                        self.selectNode(isPlain ? node.id : node, callEvent, ctrlPress);
                    }

                    //drop selection from other files and select first item
                    selectNode(nodes[0], false);

                    //select others
                    for (var i = 1, l = nodes.length; i < l; i++){
                        selectNode(nodes[i], true);
                    }
                }
            },
            selectNode: function(id, callEvent, ctrlPressed, shiftPressed){
                if ($.isArray(id)){
                    for (var i = 0, l = id.length; i < l; i++){
                        this._selectNode(id[i], callEvent, true);
                    }
                } else {
                    this._selectNode.apply(this, arguments);
                }
            },
            _selectNode: function(id, callEvent, ctrlPressed, shiftPressed){
                var map = this._getNodesMap(id);
                if (map) {
                    var divs = map['divs'];
                    this._onSelect($(divs[0]), callEvent, ctrlPressed, shiftPressed);
                }
            },
            isFolder: function(id){
                var map = this._getNodesMap(id);
                return (map && map['node']['nodes']) ? true : false;
            },
            focusNode: function(id){
                var map = this._getNodesMap(id);
                if (map) {
                    this._div.scrollTop(0);
                    this._div.scrollTop(map.divs.position().top - (this._div.height() / 2));
                }
            },
            getNode: function(id){
                var map = this._getNodesMap(id);
                return (map) ? map['node'] : undefined;
            },
            getParentNode: function(id){
                var map = this._getNodesMap(id);
                return (map) ? this.getNode(map['parentId']) : undefined;
            },
            getParentNodeId: function(id){
                var pNode = this.getParentNode(id);
                return (pNode == undefined) ? undefined : pNode.id;
            },
            setUserData: function(id, key, value){
                var map = this._getNodesMap(id);
                (map) ? map["node"]["userData"][key] = value : null;
            },
            getUserData: function(id, key){
                var map = this._getNodesMap(id);
                return (map) ? map["node"]["userData"][key] : undefined;
            },
            setNodeClass: function(id, val){
                var map = this._getNodesMap(id);
                this._setNodeCustomCss(map, map.divs, 'cssClass', val);
            },
            getNodeClass: function(id){
                return this._getNodeCustomCss(id, 'cssClass');
            },
            setNodeBung: function(id, css, action){
                var map = this._getNodesMap(id);
                var bung = {
                    css: css,
                    action: action
                };
                map.bung = bung;
                this._setNodeCustomCss(map, map.divs.find(".simple-tree-bung"), 'bungClass', bung.css);
            },
            getNodeBungClass: function(id){
                return this._getNodeCustomCss(id, 'bungClass');
            },
            setNodeSubIconClass: function(id, val){
                var map = this._getNodesMap(id);
                this._setNodeCustomCss(map, map.divs.find(".simple-tree-item-sub-icon"), 'subIconClass', val);
            },
            getNodeSubIconClass: function(id){
                return this._getNodeCustomCss(id, 'subIconClass');
            },
            _getNodeCustomCss: function(id, cssId){
                var map = this._getNodesMap(id);
                return (map) ? map['node'][cssId] : undefined;
            },
            _setNodeCustomCss: function(map, el, id, val){
                if (map){

                    (map['node'][id]) && el.removeClass(map['node'][id]);
                    if (val != ""){
                        el.addClass(val);
                    }

                    map['node'][id] = val;
                }
            },
            getNodeTitle: function(id){
                var map = this._getNodesMap(id);
                return (map) ? map['node'].title : undefined;
            },
            setNodeTitle: function(id, text){
                var map = this._getNodesMap(id);
                if (map){
                    var title = (map.node.safeTitle !== false) ? getEscapedText(text) : text;
                    map.divs.find(".simple-tree-title").html(title);
                    map.node.title = text;
                }
            },
            enable: function(val){
                if (val != undefined){
                    this._opt['enable'] = val;
                    (val !== false) ? this._div.removeClass('simple-tree-disable') : this._div.addClass('simple-tree-disable');

                }
                for (var key in this._plugins){
                    var plug = this._plugins[key];
                    if (typeof plug['enable'] == "function"){
                        plug.enable(val);
                    }
                }
                return (this._opt['enable'] !== false);
            },
            multiSelect: function(val){
                if (val != undefined){
                    this._opt['multiSelect'] = val;
                }
                return (this._opt['multiSelect'] === true);
            },
            selectedColor: function(val){
                if (val != undefined){
                    this._opt['selectedColor'] = val;

                    this._treeEnv[SELECTED_NODES_ID] && this.updateSelection(this._treeEnv[SELECTED_NODES_ID]);
                }
                return this._opt['selectedColor'];
            },
            selectedBorder: function(val){
                if (val != undefined){
                    this._opt['selectedBorder'] = val;
                    this._treeEnv[SELECTED_NODES_ID] && this.updateSelection(this._treeEnv[SELECTED_NODES_ID]);
                }
                return this._opt['selectedBorder'];
            },
            indent: function(size){
                if (size != undefined){
                    var env = this._treeEnv;
                    this._opt['indent'] = size;
                    size = (typeof size == "string") ? size : size + "px";
                    (env['indentStyle']) ? env['indentStyle'].remove() : null;
                    if (size != ""){
                        env['indentStyle'] = $("<style> #" + this._id + " .simple-tree-container {margin-left: " + size + ";} </style>");
                        this._div.parent().prepend(env['indentStyle']);
                    }
                }
                return this._opt['indent'];
            },
            filterBy: function(title, type){
                //def drop all

            },
            plugins: function(){
                return this._plugins;
            },
            destroy: function(){
                this.destroyPlugins();
                if (this._data){
                    var id = this._data['id'];
                    if (id != undefined){
                        this.removeNode(id);
                    }
                }
                var env = this._treeEnv;
                if (env && env['iconStyle']){
                    env['iconStyle'].remove();
                    delete env['iconStyle'];
                }
                if (this._div){
                    this._div.empty();
                    this._div.remove();
                }
                this._nodesMap = undefined; this._data = undefined; this._treeEnv = undefined; this._plugins = undefined; this._div = undefined;
                $(this).unbind();
            }
        };
        tree._init(div, data, opt);
        return tree;
    }

    //static methods
    jqSimpleTree.registerPlugin = function(name, plugin){
        if (!gPlugins[name]){
            gPlugins[name] = plugin;
        } else {
            showError("plugin '" + name + "' already exists");
        }
    };

    return jqSimpleTree;
});