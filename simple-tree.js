/**
* jQuery Simple Tree
* @version: 0.6 - 2011.10.20
* @author: dudiq
* @licence: MIT http://www.opensource.org/licenses/mit-license.php
**/
(function(window, console) {

function jqSimpleTree(div, data, opt) {
    var safeTextBuff = $("<div/>");

    function getEscapedText(text){
        text = text || "";
        return safeTextBuff.text(text).html();
    }

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
                this._error("Error :: There are undefined HTML Container for draw tree");
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
            for (var i in jqSimpleTree.plugins){
                var tPlug = jqSimpleTree.plugins[i];
                if (plugins[tPlug.pluginName]){
                    var plug = new tPlug(this, plugins[tPlug.pluginName]);
                    this._plugins[tPlug.pluginName] = plug;
                }
            }
        },
        destroyPlugins: function(){
            for (var i in this._plugins){
                this._plugins[i].destroy();
                delete this._plugins[i];
            }
        },
        id: function(){return this._id;},
        setData: function(data) {
            if (data != undefined) {
                this.clear();
                var treeData = ($.isArray(data)) ? {hideNodeTitle: true, nodes: data} : data;
                if (this._addNewNode(undefined, treeData, this._div)){
                    this._data = data;
                }
            }
        },
        getData: function(){
            return (jQuery.extend(true, {}, {val: this._data})).val;
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
        _log: function(msg){
            if (console)
                console.log(msg);
        },
        _error: function(msg){
            if (console)
                console.error(msg);
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
            (this._treeEnv['iconStyle']) && this._treeEnv['iconStyle'].remove();

            if (!isNaN(size)){
                var div = this._div,
                    className = "simple-tree-item-icon";
                if (size > 50 || size < 0){
                    size = size + "px";
                    this._treeEnv['iconStyle'] = $("<style> #" + this._id + " ." + className + " {width: " + size + "; height: " + size + ";} </style>");
                    div.parent().prepend(this._treeEnv['iconStyle']);
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

            (isClosed && ul) ? ul.hide() : null;
            if (node.hideNodeTitle === true) {
                itemDiv.hide();
                (ul != undefined) ? ul.css("margin", "0") : undefined;
            }
            itemDiv.data({
                "id": node.id
            });
            node.userData = (node.userData == undefined) ? {} : node.userData;
            return {itemDiv: itemDiv, ul: ul};
        },
        _addNewNode: function(parentId, data, buff, pos){
            if (!buff){
                this._error('Error :: append HTML element to undefined container');
                return;
            }
            var tmpDiv = $("<div>"); tmpDiv.data("id", parentId);
            var nodesMap = this._nodesMap,
                newLine,
                canAdd = true,
                self = this;
            this._traverseNodes(data, function(node, pdiv) {
                //create node and return $("<ul>") element if node has children
                node.id = (node.id == undefined) ? self._generateUniqueId(nodesMap) : node.id;
                if (nodesMap[node.id] != undefined){
                    self._error("Error :: Detects duplicate ID in data");
                    canAdd = false;
                    return false;
                } else {
                    newLine = self._createLine(node);
                    nodesMap[node.id] = {node: node, divs: newLine.itemDiv, nodesContainer: newLine.ul, parentId: pdiv.data("id")};
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
        _traverseNodes: function(node, callback, opt) {
            var list = node['nodes'], pDiv,
                div = opt && opt.div,
                params,
                self = this,
                reverse = opt && opt.reverse;
            if ($.isArray(node)) {
                list = node;
                pDiv = div;
            } else {
                pDiv = callback.call(this, node, div);
            }
            if (list != undefined && pDiv !== false) {
                var i = 0, l = list.length;
                function callTraverse(){
                    params = opt || {};
                    params.div = pDiv;
                    return self._traverseNodes(list[i], callback, params);
                }

                if (reverse){
                    for (i = list.length - 1; i >= 0; i--){
                        //walk by reverse
                        if (callTraverse() === false){
                            break;
                        }
                    }
                } else {
                    for (i = 0, l = list.length; i < l; i++){
                        //walk by default
                        if (callTraverse() === false){
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
                this._error('Error :: Wrong parent ID');
                return;
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
            if (this._addNewNode(parentId, newData, sysStruct.nodesContainer, pos)){
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
            var sysStruct = this._getNodesMap(id),
                self = this;
            if (!sysStruct){
                this._error('Error :: There are no ID in tree');
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
                        this._traverseNodes(children[i], function(cNode){
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
                    var id = nodes[i];
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
                    $(tree).trigger(jqSimpleTree.onExpandNode, [id]);
                }
            } else {
                el.addClass("simple-tree-close");
                (nodeContainer) ? nodeContainer.hide() : null;
                node.closed = true;
                if (callEvent){
                    $(tree).trigger(jqSimpleTree.onCollapseNode, [id]);
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
                div = this._div;
            //bind events to root div. we don't need to bind events to every child
            this._div.unbind("mousedown.simpleTree").bind("mousedown.simpleTree", function(ev){
                if (self.enable()){
                    var el = self._getEventElem(ev),
                        parentEl = self._getParentItemElement(el),
                        isExpandClick = el.hasClass("simple-tree-expand");
                    if (!isExpandClick && parentEl != null && parentEl.length !=0){
                        $(tree).trigger(jqSimpleTree.onMouseDown, [parentEl.data("id"), el]);
                    }
                }
            }).unbind("click.simpleTree").bind("click.simpleTree", function(ev){
                if (self.enable()){
                    var el = self._getEventElem(ev),
                        parentEl = self._getParentItemElement(el),
                        isExpandClick = el.hasClass("simple-tree-expand");
                    if (isExpandClick && !el.hasClass("simple-tree-no-child") && parentEl.hasClass("simple-tree-folder")){
                        self._expandCollapseNode(el);
                    }
                    if (!isExpandClick && parentEl != null && parentEl.length !=0){
                            self._onSelect(parentEl, true, self._isCtrlPressed(ev));
                            $(tree).trigger(jqSimpleTree.onClick, [parentEl.data("id"), el, parentEl]);
                    }
                    if (!self.stopBubbleEvent()){
                        ev.stopPropagation();
                    }
                }
            }).unbind("dblclick.simpleTree").bind("dblclick.simpleTree", function(ev){
                if (self.enable()){
                    var el = self._getEventElem(ev),
                        parentEl = self._getParentItemElement(el),
                        isExpandClick = el.hasClass("simple-tree-expand");
                    if (!isExpandClick && parentEl != null && parentEl.length !=0){
                        $(tree).trigger(jqSimpleTree.onDblClick, [parentEl.data("id"), el]);
                    }
                    if (!self.stopBubbleEvent()){
                        ev.stopPropagation();
                    }
                }
            }).unbind("mouseover.simpleTree").bind("mouseover.simpleTree", function(ev){
                if (self.enable()){
                    var el = self._getEventElem(ev);
                    if (el.hasClass("simple-tree-title")) {
                        var clickEl = self._getParentItemElement(el);
                        $(tree).trigger(jqSimpleTree.onMouseOver, [clickEl.data("id")]);
                    }
                }
            }).unbind("mouseout.simpleTree").bind("mouseout.simpleTree", function(ev){
                if (self.enable()){
                    var el = self._getEventElem(ev);
                    if (el.hasClass("simple-tree-title")) {
                        var clickEl = self._getParentItemElement(el);
                        $(tree).trigger(jqSimpleTree.onMouseOut, [clickEl.data("id")]);
                    }
                }
            });
        },
        _isCtrlPressed: function(ev){
            return (ev) ? ev.ctrlKey || ev.metaKey: false;
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
        _onSelect: function(el, callEvent, ctrlPressed){
            if (!this.enable()) return;
            var env = this._treeEnv;
            (!env["selectedNodesId"]) ? env["selectedNodesId"] = [] : null;
            var self = this,
                selCss = "simple-tree-item-selected",
                oldSelId = env["selectedNodeId"],
                selNodes = env["selectedNodesId"],
                selId = env["selectedNodeId"] = el.data("id");
            if (ctrlPressed && this.multiSelect()){
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
            } else {
                //single click
                env["selectedNodesId"] = [selId];
                this._div.find("table."+selCss).each(function(){
                    self._removeSelectedStyleToEl($(this));
                });
                this._setSelectedStyleToEl(el);
            }
            if (callEvent !== false){
                $(tree).trigger(jqSimpleTree.onSelect, [selId, oldSelId]);
            }
        },
        updateSelection: function(ids){
            var self = this;
            function update(id){
                var env = self._treeEnv,
                    selCss = "simple-tree-item-selected",
                    selNodes = env["selectedNodesId"],
                    selNode,
                    node;
                (id != undefined) ? node = self._getNodesMap(id) : node = self._getNodesMap(env["selectedNodeId"]);
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
                selNodes = env["selectedNodesId"],
                selNode,
                node;
            (id != undefined) ? node = this._getNodesMap(id) : node = this._getNodesMap(env["selectedNodeId"]);
            (node) ? this._removeSelectedStyleToEl(node['divs']) : null;

            if ($.isArray(selNodes)){
                for (var i = 0, l = selNodes.length; i < l; i++){
                    if (id == undefined || selNodes[i] == id){
                        selNode = this._getNodesMap(selNodes[i]);
                        (selNode) ? this._removeSelectedStyleToEl(selNode['divs']) : null;
                    }
                }
            }
        },
        getSelectedNodes: function(){
            var selNodes = this._treeEnv["selectedNodesId"],
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
            var ret = this._treeEnv["selectedNodesId"];
            return (ret == undefined) ? [] : ret;
        },
        getSelectedNode: function(){
            return this.getNode(this._treeEnv["selectedNodeId"]);
        },
        getSelectedNodeId: function(){
            var selNode = this.getSelectedNode();
            return (selNode == undefined) ? undefined : selNode.id;
        },
        selectNode: function(id, callEvent){
            if ($.isArray(id)){
                for (var i = 0, l = id.length; i < l; i++){
                    this._selectNode(id[i], callEvent, true);
                }
            } else {
                this._selectNode.apply(this, arguments);
            }
        },
        _selectNode: function(id, callEvent, ctrlPressed){
            var map = this._getNodesMap(id);
            if (map) {
                var divs = map['divs'];
                this._onSelect($(divs[0]), callEvent, ctrlPressed);
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
        setNodeBungClass: function(id, val){
            var map = this._getNodesMap(id);
            this._setNodeCustomCss(map, map.divs.find(".simple-tree-bung"), 'bungClass', val);
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
                if (val == ""){
                    (map['node'][id] != undefined && map['node'][id] != "") ? el.removeClass(map['node'][id]) : null;
                } else {
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
            for (var i in this._plugins){
                var plug = this._plugins[i];
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

                this._treeEnv["selectedNodesId"] && this.updateSelection(this._treeEnv["selectedNodesId"]);
            }
            return this._opt['selectedColor'];
        },
        selectedBorder: function(val){
            if (val != undefined){
                this._opt['selectedBorder'] = val;
                this._treeEnv["selectedNodesId"] && this.updateSelection(this._treeEnv["selectedNodesId"]);
            }
            return this._opt['selectedBorder'];
        },
        stopBubbleEvent: function(val){
            if (val != undefined){
                this._opt['stopBubbleEvent'] = val;
            }
            return (this._opt['stopBubbleEvent'] === true);
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
jqSimpleTree.onClick = "Event#jqSimpleTree#onClick";
jqSimpleTree.onDblClick = "Event#jqSimpleTree#onDblClick";
jqSimpleTree.onSelect = "Event#jqSimpleTree#onSelect";
jqSimpleTree.onExpandNode = "Event#jqSimpleTree#onExpandNode";
jqSimpleTree.onCollapseNode = "Event#jqSimpleTree#onCollapseNode";
jqSimpleTree.onMouseDown = "Event#jqSimpleTree#onMouseDown";
jqSimpleTree.onMouseOver = "Event#jqSimpleTree#onMouseOver";
jqSimpleTree.onMouseOut = "Event#jqSimpleTree#onMouseOut";
jqSimpleTree.plugins = {};

window['jqSimpleTree'] = jqSimpleTree;

})(window, window['console']);