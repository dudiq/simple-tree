define(function (require) {
    $(document).ready(function() {

        var jqSimpleTree = require("simple-tree");
        var jqSimpleTreeDrag = require("simple-tree-drag");
        var jqSimpleTreeFlowDrag = require("simple-tree-flowdrag");

        var simpleData = {title:"root", id:0,
            nodes:[
                {title:"chi   ld", alt:"alt", id: 5, nodes:[{title:"c hl3", id: 4, cssClass:'testCss'}, {title: "ch4", id:3, closed:true, nodes:[{id: "ko", title:"ko"}]}]},
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
                showTitle:true,
                multiSelect: true,
                    onClick: function(data){
                        console.dir(arguments);
                        console.log("click");
                    },
                    onDblClick: function(){
                        console.log("dblclick");
                    },
                    onSelect: function(){
                        console.log("select");
                    },
                    onExpandNode: function(){
                        console.log("expand");
                    }
                }
        );


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
            {title:"child2", id: 5, nodes:[
//                {title:"ch4", id: 2, nodes:[]},
                {title: "ch42", id:3, canDrag: false, nodes:[
                    {title:"ch46", nodes:[
                        {title:"ch47", nodes:[
                            {title:"ch4 file"},
                            {title:"c46 file"}
                        ]}
                    ]}
                ]}
            ]},
            {title:"ch55", id: 55, nodes: [], canDragInto : false},
            {title:"ch44ch44ch44ch44ch44ch44ch44", id: 44, nodes: []},
            {title:"c89", id: 1, nodes: [
                {title: "h5"},
                {title: "h6"}
            ]}
        ]},
            {
                onSelectionChanged: function(newSel, oldSel){
                    console.log("onSelectionChanged", newSel, oldSel);
                },
                onClick: function(){
                    console.log("click");
                },
                multiSelect: true, plugins:{flowDrag: {
                enable: true,
                pulling: true,
                treeBorderLimit: true,
                dragStart: function(){
                    //return false;
                },
                dragEnd: function(dragNode, parentId, pos, source, destination){
                    console.log("dragEnd", dragNode, twoTree.getNode(parentId));

                    //destination.moveNodeByPos(dragNode[0], parentId, pos, source);
                    //console.dir(destination.getData());
                }
            }
            }});


        var hugeTree = jqSimpleTree($("#hugeTree"), {title:"root", id:0, hideNodeTitle: true,
                    nodes:[{title:"f3", id: 4, icon: "http://cs5560.vk.com/u4616647/a_8b9d09a0.jpg",  nodes:[{title:"chl5", id: 2}, {title: "ch4", id:3}]},
                            {title:"f2", id: 1, nodes: []},
                        {title:"f3", id: 23},
                        {title:"f2", id: 24}
                    ]},
                                    {sort:true, plugins: {flowDrag:{
                                        dragEnd: function(dragNode, id, pos){
                                            hugeTree.moveNodeByPos(dragNode[0], id, pos);
                                        }
                                    }}}
                );

        var createHugeNode = function(){
            // return node with 50 nodes
            function newTitle() {
                return hugeTree._generateUniqueId().substring(0, 5) + title;
            }
            var maxChilds = 100,
                maxNest = 2,
                title = "Soooo long stiiiiiing, yeahh. this is simple string, include some words. for example this, or that. i want to believe.",
                hugeNode = {title: newTitle(), nodes:[], closed: true};
            var fill = function(nodes, maxNest){
                maxNest--;
                for (var i = 0; i < maxChilds; i++){

                    var item = {title: newTitle(), nodes: [], closed: true};
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
                var item = {title: newTitle(), nodes: [], closed: true}; //, closed: ((3*Math.random() > 1) ? true : false)
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
            var node = hugeTree.getNode(4) || hugeTree.getRootNode();
            hugeTree.addNode(node.id,{title:"ch1"});
            hugeTree.setNodeBung(node.id, "test", function(){
                console.log("Test");
            });
        });

        $("#huge").click(function(){
            //append huge node to tree
            var node = jQuery.extend(true, {}, hugeNode);
            var begin = new Date;
            console.log();
            hugeTree.setData(node);
            console.log((new Date) - begin + "ms");
            begin  = new Date();
            var count = 0;
            hugeTree.traverseNodes(hugeTree.getRootNode(), function(){
                count++;
            });
            console.log((new Date) - begin + "ms" + count);

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

    });
});