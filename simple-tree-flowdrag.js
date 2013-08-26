/**
* jQuery drag plugin for Simple Tree
* https://github.com/dudiq/simple-tree
*
* @version: 0.4 - 2011.10.20
* @author: dudiq
* @licence: MIT http://www.opensource.org/licenses/mit-license.php
**/
define(function (require) {
    var $ = require('jquery');
    var simpleTree = require('./simple-tree');

    var touchSupport = 'ontouchstart' in window.document;
    var namespace_ev = ".simple-tree-flowdrag";
    var start_ev = (touchSupport ? 'touchstart' : 'mousedown') + namespace_ev;
    var move_ev = (touchSupport ? 'touchmove' : 'mousemove') + namespace_ev;
    var end_ev = (touchSupport ? 'touchend' : 'mouseup') + namespace_ev;

    var openClosedFolderTimer;
    function openClosedFolder(tree, target){
        clearInterval(openClosedFolderTimer);
        if (target.hasClass("simple-tree-folder")){
            var el = target.find(".simple-tree-expand.simple-tree-close");
            if (el.length > 0){
                openClosedFolderTimer = setInterval(function(){
                    clearInterval(openClosedFolderTimer);
                    tree._expandCollapseNode(el);
                }, 1500);
            }
        }
    }

    var helper = $("<div class='simple-tree-flowdraw-helper'/>");
    var hLeft, hTop, hDim = {};
    function moveHelper(winEv, options){
        //moving elements
        var hLeft = winEv.clientX + 15;
        var hTop = winEv.clientY + 10;

        if (options.treeBorderLimit){
            (hLeft >= hDim.right) && (hLeft = hDim.right);
            (hLeft <= hDim.left) && (hLeft = hDim.left);

            (hTop >= hDim.bottom) && (hTop = hDim.bottom);
            (hTop <= hDim.top) && (hTop = hDim.top);
        }

        helper[0].style.left = hLeft + "px";
        helper[0].style.top = hTop + "px";
    }


    function checkDragInto(id, nodes){
        var node = this._tree.getNode(id);
        var can = (node && node.canDragInto !== false);
        ($.inArray(node, nodes) != -1) && (can = false);
        return can;
    }

    function getDragNodes(){
        var selNodes = this._tree.getSelectedNodes();

        var can = true;
        var dragNodes = [];
        for (var i = 0, l = selNodes.length; i < l; i++){
            if (selNodes[i].canDrag !== false){
                dragNodes.push(selNodes[i]);
            }
        }
        return dragNodes;
    }

    function checkNesting(overId, itemId){
        var canDrop = (itemId != overId);
        if (canDrop){
            this._tree.traverseParents(overId, function(node){
                if (node.id == itemId){
                    canDrop = false;
                    return false;
                }
            });
        }
        return canDrop;
    }

    function dragEnd(dragNodes, overId){
        //check folders for drop into itself, and drop they
        var ret = [];
        var tree = this._tree;
        var canDrop;
        for (var i = 0, l = dragNodes.length; i < l; i++){
            var itemId = dragNodes[i].id;
            canDrop = checkNesting.call(this, overId, itemId);
            canDrop && (ret.push(dragNodes[i]));
        }

        this._opt.dragEnd && this._opt.dragEnd(ret, overId);
    }

    var dragging = function (tree, opt){
        var drag = {
            _tree: null,
            _opt: null,
            init: function(tree, opt){
                this._tree = tree;
                this._opt = (typeof opt == "object") ? opt : {};
                this.initDrag();
            },
            reDraw: function(){
                this.destroy();
                this.initDrag();
            },
            initDrag: function(){
                var self = this,
                    tree = this._tree,
                    opt = this._opt,

                    dim = {},

                    $win = $(window),
                    treeDiv = tree._div,
                    $body = $(document.body),

                    dragNodes = [], canDrag,

                    dx, dy,
                    firstMove = false

                    ;

                var plane;
                var el;
                var elFolder;
                var overId, tId;

                function stopDragging(){
                    treeDiv.unbind("mouseover" + namespace_ev);
                }

                function clearDrag(){
                    dragNodes = [];
                    firstMove = false;
                    $body.removeClass("simple-tree-flowdrag-body");
                    treeDiv.removeClass("simple-tree-flowdrag");
                    $win.unbind(namespace_ev);
                    stopDragging();
                    removeSelection();
                    overId = undefined;
                    helper.css({left: -9999, top: -9999});
                }

                function removeSelection(){
                    plane && plane.removeClass("simple-tree-flowdrag-hover");
                    elFolder && elFolder.removeClass("simple-tree-flowdrag-hover");
                }

                function collectDragNodes(ev){
                    var item = tree._getParentItemElement($(ev.target));
                    //check first over item
                    dragNodes = getDragNodes.call(self);
                    if (item.length != 0){
                        var id = item.data("id");
                        var inside = false;
                        for (var i = 0, l = dragNodes.length; i < l; i++){
                            if (dragNodes[i].id == id){
                                inside = true;
                                break;
                            }
                        }
                        if (inside == false){
                            //check for first selected item and drag items
                            tree.selectNode(id, false, ev.ctrlKey || ev.metaKey);
                        }
                    }
                    dragNodes = getDragNodes.call(self);
                }

                function onDragStart(ev){
                    helper.css({left: -9999, top: -9999});

                    $body.append(helper);

                    $body.addClass("simple-tree-flowdrag-body");
                    treeDiv.addClass("simple-tree-flowdrag");
                    firstMove = false;
                    collectDragNodes(ev);
                    canDrag = (dragNodes.length !=0);
                    if (canDrag){
                        var dragStartValue = opt.dragStart && opt.dragStart();
                        if (dragStartValue === false){
                            //stop dragging
                            canDrag = false;
                            clearDrag();
                        } else {
                            bindMouseOver();
                        }
                    }
                }

                function bindMouseOver(){
                    stopDragging();
                    var hText = (dragNodes.length == 1) ? dragNodes[0].title : dragNodes[0].title + " + " + (dragNodes.length - 1);
                    helper.html(hText);

                    hDim.left = treeDiv.offset().left;
                    hDim.top = treeDiv.offset().top;
                    hDim.bottom = treeDiv.offset().top + treeDiv.height() - helper.outerHeight();
                    hDim.right = treeDiv.offset().left + treeDiv.width();// - helper.outerWidth()


                    treeDiv.bind("mouseover" + namespace_ev, function(ev){
                        el = $(ev.target);
                        removeSelection();
                        plane = el.closest(".simple-tree-container");
                        elFolder = el.closest(".simple-tree-folder");
                        overId = undefined;
                        clearInterval(openClosedFolderTimer);
                        if (elFolder.length == 0){
                            //drop area for children
                            tId = plane.data("id");
                            if (checkDragInto.call(self, tId)){
                                elFolder = plane.prev();
                                elFolder.addClass("simple-tree-flowdrag-hover");
                                plane.addClass("simple-tree-flowdrag-hover");
                                overId = tId;
                            }
                        } else {
                            tId = elFolder.data("id");
                            if (checkDragInto.call(self, tId, dragNodes)){
                                elFolder.addClass("simple-tree-flowdrag-hover");
                                overId = tId;
                                openClosedFolder(tree, elFolder);
                            }
                        }
                    });

                }

                function checkClick(ev){
                    var item = tree._getParentItemElement($(ev.target));
                    var ret = (item.length != 0);
                    if (item.length != 0){

                        var node = tree.getNode(item.data("id"));
                        if (!node){
                            ret = false;
                        }
                    }
                    return ret;
                }

                function bindWindowEvents(ev){
                    //check target for exists in dragNodes
                    var which = ev.which;
                    if (checkClick.call(self, ev)){
                        $win.bind(move_ev, function(ev){
                            if (which != ev.which){
                                //hack for iframe
                                clearDrag();
                                return false;
                            }

                            var thatPoint = firstMove && (firstMove.clientX != ev.clientX && firstMove.clientY != ev.clientY);

                            if (thatPoint && !ev.shiftKey){
                                //create elements
                                onDragStart(ev);
                            } else if (canDrag){
                                moveHelper(ev, opt);
                            }
                            //drop selection
                            ev.preventDefault();
                            return false;
                        }).bind(end_ev, function(ev){
                                if (!firstMove && canDrag && overId !== undefined){
                                    dragEnd.call(self, dragNodes, overId);
                                }
                                clearDrag();
                        });

                    } else {
                        clearDrag();
                    }
                }

                clearDrag();

                treeDiv.unbind(start_ev).bind(start_ev, function(ev){
                    if (self.enable()){
                        clearDrag();
                        firstMove = {clientX: ev.clientX, clientY: ev.clientY};
                        bindWindowEvents(ev);

                    }
                });

            },
            enable: function(val){
                if (val != undefined){
                    this._opt["enable"] = val;
                    (val) && this.initDrag();
                }
                var ret = (this._opt["enable"] !== false);
                return ret;
            },
            destroy: function(){
                this._opt = null;
                this._tree = null;
            }
        };
        drag.init(tree, opt);
        return drag;
    };

    simpleTree.registerPlugin('flowDrag', dragging);

    return dragging;
});