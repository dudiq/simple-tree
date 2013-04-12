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
    function moveHelper(winEv){
        //moving elements
        var hLeft = winEv.clientX + 5;
        var hTop = winEv.clientY - 30;

        (hLeft <= hDim.left) && (hLeft = hDim.left);
        (hLeft >= hDim.right) && (hLeft = hDim.right);

        (hTop <= hDim.top) && (hTop = hDim.top);
        (hTop >= hDim.bottom) && (hTop = hDim.bottom);

        helper[0].style.left = hLeft - hDim.left + "px";
        helper[0].style.top = hTop - hDim.top + "px";
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

                function onDragStart(ev){
                    helper.css({left: -9999, top: -9999});
                    treeDiv.append(helper);
                    $body.addClass("simple-tree-flowdrag-body");
                    treeDiv.addClass("simple-tree-flowdrag");
                    firstMove = true;
                    var item = tree._getParentItemElement($(ev.target));
                    //check first over item
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
                            tree.selectNode(id, false, ev.ctrlKey || ev.metaKey);
                            dragNodes = getDragNodes.call(self);
                            bindMouseOver();
                        }
                    }
                }

                function bindMouseOver(){
                    stopDragging();
                    canDrag = (dragNodes.length !=0);
                    if (canDrag){
                        var hText = (dragNodes.length == 1) ? dragNodes[0].title : dragNodes[0].title + " + " + (dragNodes.length - 1);
                        helper.html(hText);

                        hDim = {
                            left : treeDiv.offset().left,
                            top : treeDiv.offset().top,
                            bottom : treeDiv.offset().top + treeDiv.height() - helper.outerHeight(),
                            right : treeDiv.offset().left + treeDiv.width() - helper.outerWidth()
                        };

                        treeDiv.bind("mouseover" + namespace_ev, function(ev){
                            el = $(ev.target);
                            removeSelection();
                            plane = el.closest(".simple-tree-container");
                            elFolder = el.closest(".simple-tree-folder");
                            overId = undefined;
                            if (elFolder.length == 0){
                                //drop area for children
//                            tId = plane.data("id");
//                            if (checkDragInto.call(self, tId)){
//                                plane.addClass("simple-tree-flowdrag-hover");
//                                overId = tId;
//                            }
                            } else {
                                plane.removeClass("simple-tree-flowdrag-hover");
                                tId = elFolder.data("id");
                                if (checkDragInto.call(self, tId, dragNodes)){
                                    elFolder.addClass("simple-tree-flowdrag-hover");
                                    overId = tId;
                                    openClosedFolder(tree, elFolder);
                                }
                            }
                        });
                    }
                }

                function bindWindowEvents(){
                    dragNodes = getDragNodes.call(self);
                    bindMouseOver();
                    $win.bind(move_ev, function(ev){
                        if (!firstMove){
                            //create elements
                            onDragStart(ev);
                        } else if (canDrag){
                            moveHelper(ev);
                        }
                    }).bind(end_ev, function(ev){
                            if (firstMove && canDrag && overId !== undefined){
                                self._opt.dragEnd && self._opt.dragEnd(dragNodes, overId);
                            }
                            clearDrag(ev);
                    });
                }

                clearDrag();

                treeDiv.bind(start_ev, function(ev){
                    if (self.enable()){
                        firstMove = false;
                        clearDrag(ev);
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