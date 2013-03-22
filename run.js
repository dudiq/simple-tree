define(function (require) {
    $(document).ready(function() {

        var jqSimpleTree = require("simple-tree");

        var simpleData = {title:"root", id:0,
            nodes:[
                {title:"child", alt:"alt", id: 5, nodes:[{title:"chl3", id: 4, cssClass:'testCss'}, {title: "ch4", id:3, closed:true, nodes:[{id: "ko", title:"ko"}]}]},
                {title:"ch2", id: 1, nodes: []}
            ]
        };
        ///drag sample with pulling
        var newTree = jqSimpleTree(
                $("#simpleTree"),//draw div
                jQuery.extend(true, {}, simpleData), //data
                {plugins:{ //options
                    drag: {
                        pulling: false,
                        dragEnd: function(){
                            console.dir(arguments);
                        }
                        }
                    },
                indent:5,
                multiSelect: true
                }
        );
        $(newTree).bind(jqSimpleTree.onClick, function(ev, data){
            console.dir(arguments);
            console.log("click");
        });
        $(newTree).bind(jqSimpleTree.onDblClick, function(ev, data){
            console.log("dblclick");
        });
        $(newTree).bind(jqSimpleTree.onSelect, function(ev, data){
            console.log("select");
        });
        $(newTree).bind(jqSimpleTree.onExpandNode, function(){
            console.log("expand");
        });


        $("#init").click(function(){
            newTree.setData(jQuery.extend(true, {}, simpleData));
        });

        $("#rchild").click(function(){
            newTree.removeChildren(newTree.getSelectedNodeId());
        });

        $("#test").click(function(){
            newTree.addNode(1, []);
            //newTree.removeNode(0)
            console.dir(newTree.getParentNode(0));
            console.dir(newTree.getData());
//            newTree.enable(false);
            console.dir(newTree.getSelectedNodes());
            newTree.indent(10);
            console.log("root = " +newTree.getRootNode());
//            setTimeout(function(){
//                newTree.enable(true);
//                newTree.indent("");
//            },1000);
            //newTree.clearSelection(newTree.getSelectedNodeId());
            newTree.selectedColor("red");
        });
        $("#remove").click(function(){
            if (newTree.getNode(4)){
                newTree.removeNode(4);
            } else if (newTree.getNode(7)){
                newTree.removeNode(7);
            } else {
		        newTree.removeNode(0);
                //newTree.setData({title:"first", id:0, nodes:[{title:"child", id: 5, nodes:[{title:"chl3", id: 2}, {title: "ch4", id:3}]}, {title:"ch2", id: 1}]});
            }
            console.dir(newTree.getData());
        });

        //drag sample
        var twoTree = jqSimpleTree($("#twoTree"), {title:"root", id:0, nodes:[
            {title:"child", id: 5, nodes:[
                {title:"chl3", id: 2},
                {title: "ch4", id:3}
            ]},
            {title:"ch2", id: 1, nodes: []}
        ]}, {plugins:{drag: {
                enable: true,
                dragEnd: function(dragNode, parentId, pos, source, destination){
                    console.dir(arguments);

                    destination.moveNodeByPos(dragNode, parentId, pos, source);
                    console.dir(destination.getData());
                }
            }
            }});

        var hugeTree = jqSimpleTree($("#hugeTree"), {title:"root", id:0, hideNodeTitle: true,
                    nodes:[{title:"f3", id: 4, icon: "http://cs5560.vk.com/u4616647/a_8b9d09a0.jpg",  nodes:[{title:"chl5", id: 2}, {title: "ch4", id:3}]},
                            {title:"f2", id: 1, nodes: []},
                        {title:"f3", id: 23},
                        {title:"f2", id: 24}
                    ]},
                                    {sort:true, plugins: {drag:{
                                        dragEnd: function(dragNode, id, pos, source, destination){
                                            destination.moveNodeByPos(dragNode, id, pos, source);
                                        }
                                    }}}
                );

        var createHugeNode = function(){
            // return node with 50 nodes
            var maxChilds = 25,
                maxNest = 2,
                title = "Soooo long stiiiiiing, yeahh. this is simple string, include some words. for example this, or that. i want to believe.",
                hugeNode = {title: title, nodes:[]};
            var fill = function(nodes, maxNest){
                maxNest--;
                for (var i = 0; i < maxChilds; i++){
                    var item = {title: title, nodes: []};
                    nodes.push(item);
                    //debugger;
                    if (maxNest > 1){
                        fill(item.nodes, maxNest);
                    } else {
                        delete item.nodes;
                    }
                }
                //debugger;
            };
            for (var i = 0; i < maxChilds; i++){
                var item = {title: title, nodes: [], closed: ((3*Math.random() > 1) ? true : false)};
                hugeNode.nodes.push(item);
                fill(item.nodes, maxNest);
            }
            return hugeNode;
        };
        var hugeNode = createHugeNode();

        $("#createhuge").click(function(){
            hugeNode = createHugeNode();
        });

        $("#newNode").click(function(){
            hugeTree.addNode(4,{title:"ch1"});
        });

        $("#huge").click(function(){
            //append huge node to tree
            var node = jQuery.extend(true, {}, hugeNode);
            var begin = new Date;
            console.log();
            hugeTree.addNode(parseInt(4*Math.random()), node);
            console.log((new Date) - begin + "ms");
            console.dir(hugeTree.getData());
        });

        $("#focusNode").click(function(){
            hugeTree.focusNode(hugeTree.getSelectedNodeId());
        });

        hugeTree.traverseNodes(hugeTree.getData().nodes[0], function(node){
            console.log(node.title);
            return false;
        });

        //disable drag sample
        $("#disableDrag").click(function(){
            var enable = twoTree.option("drag", "enable");
            twoTree.option("drag", "enable", !enable);
            $(this).css("background-color", (enable) ? "silver" : "");
            hugeTree.setItemIcon(1, "test.jpg");
            //hugeTree.setItemIconSize(10);
            console.log(hugeTree.getLineHeight());
            console.log(hugeTree.height());
            newTree.closeNode(5);
            //newTree.destroy();
            newTree.getNodePos(5);
            newTree.setNodeClass(5, "testClass");
            setTimeout(function(){
                newTree.setNodeClass(5, "testClass2");
            }, 1000);
            console.log(newTree.getNodeClass(5));
            //newTree.setNodeClass(5, "");
            //console.log(newTree.getNodeClass(5));
            newTree.setNodeSubIconClass(5, "ssj");
        });

        //how to create draggable from other elements
        var dragPlugin = newTree.plugins()['drag'], dragObj;
        $("#forDrag").draggable({
            "cursorAt": {left: -20, top: 20},// top must be 20, for correct detect point
            start: function(){
                dragObj = dragPlugin.createDragObj({data: "data"});
                dragPlugin.onDragStart();
            },
            drag: function(ev, ui){
                dragPlugin.onDrag(ev, ui, dragObj);
            },
            stop: function(){
                dragPlugin.onDragStop(dragObj);
            }
        });
    });
});