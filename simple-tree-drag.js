/**
* jQuery drag plugin for Simple Tree
* @version: 0.4 - 2011.10.20
* @author: dudiq
* @licence: MIT http://www.opensource.org/licenses/mit-license.php
**/
(function(jqSimpleTree) {

jqSimpleTree.plugins["simpleDragForSimpleTree"] = function (tree, opt){
    var drag = {
        _tree: null,
        _opt: null,
        init: function(tree, opt){
            this._tree = tree;
            this._opt = (typeof opt == "object") ? opt : {};
            this.initDrag();
            this.pulling(this.pulling());
        },
        reDraw: function(){
            this.destroy();
            this.initDrag();
        },
        createDragObj: function(node, tHeight){
            var dragObj = {
                dragNode : node,
                height : (tHeight) ? tHeight : 18,
                treeTop: this._tree._div.parent().offset().top,
                treeHeight: this._tree._div.parent().height(),
                lastId : node.id,
                dhHeight : this._dragHelper.height(),
                source : this._tree,
                pulling: this.pulling(),
                destination : this._tree,
                pos: -5
            };
            return dragObj;
        },
        initDrag: function(){
            var tree = this._tree,
                opt = this._opt,
                container = this.container(),//container where drag will be
                dragObj = null,
                self = this,
                selFolderCss = {"-webkit-box-shadow": "0 0 7px black", "-moz-box-shadow": "0 0 7px black", "box-shadow": "0 0 7px black"},
                unSelFolderCss = {"-webkit-box-shadow": "", "-moz-box-shadow": "", "box-shadow": ""};

            this._dragHelper = $("<div class='simple-tree-drag-line'/>").hide();
            //tree._div.draggable("option", "cursorAt", {left: 20, top: 20});

            tree._div.draggable({
                helper: function(ev){
                    tree._div.draggable("option", "cursorAt", {left: 20, top: 20});
                    var target = tree._getEventElem(ev);
                    var id = ((target.hasClass("simple-tree-item")) ? target : tree._getParentItemElement(target).data("id"));
                    var div = $("<div class='simple-tree-drag-el'/>");
                    if (id != undefined){
                        var node = tree.getNode(id);
                        if (node && node.canDrag !== false){
                            div.html(node.title);
                            //helper for dragging nodes
                            var tHeight = target.parent().height() - 4; // 4px is border * 2 + padding * 2
                            dragObj = self.createDragObj(node, (tHeight == 0) ? 14 : tHeight);
                        }
                    }
                    return div;
                },
                start: function(ev, ui){
                    if (dragObj && dragObj.dragNode != null){
                        self.onDragStart(dragObj);
                    }
                },
                drag: function(ev, ui){
                    if (dragObj)
                        self.onDrag(ev, ui, dragObj);
                },
                stop: function(ev, ui){
                    self.container().removeClass('simple-tree-drag');
                    if (dragObj)
                        self._onDragStop(ev, dragObj);
                    dragObj = null;
                },
                containment: container,
                appendTo: container,
                disabled: !self.enable()
            });
        },
        _onDragStop: function(ev, dragObj){
            clearInterval(this._scrollTimer);
            this._dragHelper.hide();
            if (typeof this._opt['dragEnd'] == "function"){
                var node = dragObj.dragNode, id = dragObj.lastId, posType = dragObj.pos, parentId, pos;
                var destEl = this._tree._getEventElem(ev);
                if (node != undefined && node.id != undefined ){
                    if (this.pulling() && typeof this._opt['dragPull'] == "function"){
                        if (destEl.closest(this._tree._div).length == 0){
                            //if dropped in other container
                            this._opt['dragPull'](node, dragObj.source, destEl);
                            return;
                        }
                    }
                    if (node.id === id)
                        return;// drop if destination node == source node
                }
                var canDrop = false;
                this._tree._traverseParents(id, function(parent){
                    if (node != undefined && node.id != undefined && parent.id === node.id) {
                        canDrop = true;
                        return false;
                    }
                });
                if (canDrop) return;
                var parent = this._tree.getParentNode(id);
                if (posType == -3){
                    //is folder
                    pos = -1;
                    parentId = id;
                } else {
                    if (parent){
                        parentId = parent.id;
                        for (var i = 0, L = parent.nodes.length; i < L; i++){
                            if (parent.nodes[i].id === id){
                                pos = i;
                                break;
                            }
                        }
                        switch (posType){
                            case -2 : pos = (pos <= 0) ? 0 : pos; break;
                            case -1 : (pos >= L) ? L : pos++; break;
                        }
                    }
                }
                if (pos != undefined){
                    if (this._tree._div.parent().has(destEl).length != 0){
                        this._opt['dragEnd'](node, parentId, pos, dragObj.source, dragObj.destination);
                    }
                }
            }
        },

        onDragStart: function(){
            this.container().addClass("simple-tree-drag");
            this._dragHelper.css({left:-100, top: -100});
            this.container().append(this._dragHelper.show());
        },

        onDrag: function(ev, ui, dragObj){
            var self = this,
                target = self._getElemByEv(ev),
                getOnDragTree = self._getOnDragTree(target),
                pdx = 2, //padding 1px
                treeSource = dragObj.source;
            if (target && getOnDragTree){
                clearInterval(self._scrollTimer);
                self._dragHelper.show();
                var dragTree = (treeSource && getOnDragTree._id === treeSource._id) ? treeSource : getOnDragTree;
                if (dragTree.option && !dragTree.option("drag", "enable")){
                    //stop dragging for not drag trees
                    return;
                }
                if (treeSource && getOnDragTree._id !== treeSource._id && !dragObj.pulling){
                    return;
                }
                dragObj.destination = dragTree;
                if (target.hasClass("simple-tree-drag-line")){
                    if (dragTree._getNodesMap(dragObj.lastId) == undefined){
                        return;
                    } else {
                        target = dragTree._getNodesMap(dragObj.lastId).divs; // if mouse over dragHelper
                    }
                } else {
                    dragObj.lastId = target.data("id");
                }

                //set helper position
                var tId = target.data("id"),
                    off = (this.pulling()) ? target.offset() : target.position(),
                    uioff = (this.pulling()) ? ui.offset : ui.position,
                    dhTop = 0,
                    dy = dragObj.height - (off.top - uioff.top - pdx);

                if (dy >= dragObj.height / 2 ) {
                    dhTop = off.top + pdx + dragObj.height;
                    dragObj.pos = -1;
                } else {
                    dhTop = off.top - pdx;
                    dragObj.pos = -2;
                }

                clearInterval(self._expandTimer);
                if (dragTree.isFolder(tId)){
                    if (dragTree.getNode(tId)['canDragInto'] !== false) {
                        //use for folder
                        var dPos = dragObj.height * 0.33;
                        if(dy >=dPos && dy <= dPos * 2){
                            //folder
                            dhTop = off.top + pdx + dragObj.height * 0.5 - dragObj.dhHeight * 0.5;
                            dragObj.pos = -3;
                            self._openClosedFolder(dragTree, target);
                        }
                    }
                }

                self._dragHelper.css({left: off.left + 18, top: dhTop});
            } else {
                self._scrollDrag(ev.pageY, dragObj.treeHeight, dragObj.treeTop);
            }
        },
        _openClosedFolder: function(tree, target){
            var self = this;
            if (target.hasClass("simple-tree-folder")){
                var el = target.find(".simple-tree-expand.simple-tree-close");
                if (el.length > 0){
                    this._expandTimer = setInterval(function(){
                        clearInterval(self._expandTimer);
                        tree._expandCollapseNode(el);
                    }, 1500);
                }
            }
        },
        _scrollDrag: function(eTop, height, top){
            var dx, self = this;
            if (top > eTop){
                dx = -(top - eTop);
            } else if(eTop > top + height){
                dx = eTop - (top + height);
            }
            clearInterval(self._scrollTimer);
            if (dx){
                self._dragHelper.hide();
                dx = dx/2;
                var goScroll = function(){
                    var st = self._tree._div.scrollTop();
                    st += dx;
                    self._tree._div.scrollTop(st);
                }
                goScroll();
                this._scrollTimer = setInterval(function(){
                    goScroll();
                }, 100);
                //do scroll;
            } else {
                self._dragHelper.show();
            }
        },
        _getOnDragTree: function(target){
            var self = this;
            if (!target) return;
            var parent = target.closest(".simple-tree");
            if (!parent || parent.length == 0) return;
            var callback = parent.data("getTree");
            if (typeof callback == "function"){
                return callback();
            }
        },
        _getElemByEv: function(ev){
            var target = this._tree._getEventElem(ev);
            target = (target.hasClass("simple-tree-item")) ? target : this._tree._getParentItemElement(target);
            if (target.hasClass("simple-tree-item")){
                return target;
            }
        },
        container: function(val){
            if (val != undefined){
                this._opt["container"] = val = $(val);
                this._tree._div.draggable("option", "containment", val);
                this._tree._div.draggable("option", "appendTo", val);
            }
            return this._opt["container"];
        },
        enable: function(val){
            if (val != undefined){
                this._opt["enable"] = val;
                (val) ? this.initDrag() : this._tree._div.data("draggable") && this._tree._div.draggable("destroy");
            }
            var ret = (this._opt["enable"] !== false);
            return ret;
        },
        pulling: function(val){
            //droppable between two or more trees
            if (val != undefined){
                this._opt['pulling'] = val;
                (val == true) ? this.container(document.body) : this.container(this._tree._div);
            }
            return (this._opt['pulling'] !== false);
        },
        destroy: function(){
            this._dragHelper.remove();
            if (this._tree._div.data("draggable"))
               this._tree._div.draggable("destroy");
        }
    };
    drag.init(tree, opt);
    return drag;
};
jqSimpleTree.plugins["simpleDragForSimpleTree"].pluginName = "drag";

})(jqSimpleTree);