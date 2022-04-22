"use strict";
const handler = document.querySelector(".handler");
const wrapper = document.querySelector(".contents");
const left_region = document.querySelector(".left_region");
const menus = document.querySelectorAll(".menu");
const item_boxes = document.querySelectorAll(".menu_item svg");
const mid_region = document.querySelector(".mid_region");
const board = document.querySelector(".board");
const text = document.querySelector("#text");
const font_size = document.querySelector("#font_size");
const link_btn = document.querySelector("#link_btn");
const link_del_btn = document.querySelector("#link_dle_btn");

const MIN_WIDTH = 0;

const ns = "http://www.w3.org/2000/svg";
const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;

const DEFAULT_NODE_SCALE = 3;
const DEFAULT_SNAP_GAP = 10;
let ZOOM_VAL = 1;

//Select Node
let selectedElement = null;
const selectedElement_set = new Set();

//Drag Node
let isDragging = false;

//Creating Node
let creatingElement_g = null;
let selectedBox_svg = null;

//Resizing left_region
let canResizing = false;
let clicked_Xpos = 0;

//Resizer
let curResizersTag = null;
let selectedResizer = null;

let isLinking = false;
let isDelLinking = false;
let from_node = null;
let to_node = null;
let from_to_list = [];
let LeaderLine_list = [];
/**********************************************************************************************/
//#region Util
let CTRLKEY = false;

function _ViewPort2BoardSpace(clientX, clientY) {
    const CTM = board.getScreenCTM();

    return {
        x: (clientX - CTM.e) / CTM.a,
        y: (clientY - CTM.f) / CTM.d,
    };
}
function _SnapBoardSpace(x, y) {
    return [x, y].map(
        (num) => parseInt(num / DEFAULT_SNAP_GAP) * DEFAULT_SNAP_GAP
    );
}
function _SetSeletedOffsets() {
    const reg = /translate\((.*?) (.*?)\) scale\((.*?) (.*?)\)/;

    for (let target of selectedElement_set) {
        const regResult = target.getAttribute("transform").match(reg);
        //console.log("[REGEXP RESULT]", regResult);
        const [translateX, translateY] = [regResult[1], regResult[2]];
        const [scaleX, scaleY] = [regResult[3], regResult[4]];

        target.translateOffsetX = Number(translateX);
        target.translateOffsetY = Number(translateY);
        target.scaleOffsetX = Number(scaleX);
        target.scaleOffsetY = Number(scaleY);
    }
}
function _SetGtagTransform(gTag, translateX, translateY, scaleX, scaleY) {
    gTag.setAttribute(
        "transform",
        `translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`
    );
}
function _MoveGtag(
    gTag,
    toViewPortX,
    toViewPortY,
    viewPortOffSetX,
    viewPortOffSetY
) {
    const deltaX = (toViewPortX - viewPortOffSetX) / ZOOM_VAL;
    const deltaY = (toViewPortY - viewPortOffSetY) / ZOOM_VAL;

    const resultX = Number(gTag.translateOffsetX) + Number(deltaX);
    const resultY = Number(gTag.translateOffsetY) + Number(deltaY);

    const [snapX, snapY] = _SnapBoardSpace(resultX, resultY);
    _SetGtagTransform(gTag, snapX, snapY, gTag.scaleOffsetX, gTag.scaleOffsetY);
}
function _DeleteGtag(gTag) {
    console.log("[G_TAG_DELETED]");
    selectedElement_set.delete(gTag);
    if (selectedElement === gTag) selectedElement = null;
    showResizers(selectedElement);
    gTag.remove();
    from_to_list = from_to_list.filter((x) => x[0] !== gTag && x[1] !== gTag);
    isLinking = false;
    from_node = null;
    to_node = null;
    drawLines();
}
//#endregion

//#region SideBarHandle
function onMouseDown_Handler(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    if (event.target !== handler) return;
    clicked_Xpos = event.clientX - handler.getBoundingClientRect().left;
    canResizing = true;
}
function onMouseMove_Handler(event) {
    if (canResizing) {
        let pointerRelativeXpos = event.clientX - clicked_Xpos;
        left_region.style.width =
            Math.max(MIN_WIDTH, pointerRelativeXpos) + "px";
        left_region.style.flexGrow = 0;
    }
}
function onMouseUp_Handler(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    canResizing = false;

    if (creatingElement_g) {
        if (event.target !== board) {
            _DeleteGtag(creatingElement_g);
            creatingElement_g = null;
            selectedBox_svg = null;
        }
    }
}
document.addEventListener("mousedown", onMouseDown_Handler);
document.addEventListener("mousemove", onMouseMove_Handler);
document.addEventListener("mouseup", onMouseUp_Handler);
//#endregion
/**********************************************************************************************/
//#region Menu
function onClick_Menu(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    event.stopPropagation();
    event.currentTarget.parentNode.children[1].classList.toggle("active");
}

menus.forEach((menu) => {
    menu.addEventListener("click", onClick_Menu);
});
//#endregion
/**********************************************************************************************/
function onMouseDown_Resizer(event) {
    event.preventDefault();
    selectedResizer = event.target;

    selectedResizer.clickOffsetX = event.clientX;
    selectedResizer.clickOffsetY = event.clientY;

    const reg = /translate\((.*?) (.*?)\) scale\((.*?) (.*?)\)/;

    const regResult = selectedElement.getAttribute("transform").match(reg);
    const [translateX, translateY] = [regResult[1], regResult[2]];
    const [scaleX, scaleY] = [regResult[3], regResult[4]];
    selectedResizer.translateOffsetX = Number(translateX);
    selectedResizer.translateOffsetY = Number(translateY);
    selectedResizer.scaleOffsetX = Number(scaleX);
    selectedResizer.scaleOffsetY = Number(scaleY);

    selectedResizer.selectedElementRect =
        selectedElement.getBoundingClientRect();
}

function onMouseMove_Resizer(event) {
    if (selectedResizer) {
        const gTag = selectedElement;
        const board_pos_click = _ViewPort2BoardSpace(
            event.clientX,
            event.clientY
        );
        const board_pos_offset = _ViewPort2BoardSpace(
            selectedResizer.clickOffsetX,
            selectedResizer.clickOffsetY
        );
        const deltaX =
            (board_pos_click.x - board_pos_offset.x) *
            selectedResizer.scaleOffsetX;
        const deltaY =
            (board_pos_click.y - board_pos_offset.y) *
            selectedResizer.scaleOffsetY;

        //원래길이
        const selectedElementRect = selectedResizer.selectedElementRect;
        //zoom은 나중에처리

        const ratioX = deltaX / selectedElementRect.width;
        const ratioY = deltaY / selectedElementRect.height;

        const resultX = selectedResizer.scaleOffsetX + ratioX;
        const resultY = selectedResizer.scaleOffsetY + ratioY;

        const targetBBox = gTag.querySelector(".selected").getBBox();
        const [snapX, snapY] = _SnapBoardSpace(
            resultX * targetBBox.width,
            resultY * targetBBox.height
        );
        const X = snapX / targetBBox.width;
        const Y = snapY / targetBBox.height;
        _SetGtagTransform(
            gTag,
            selectedResizer.translateOffsetX,
            selectedResizer.translateOffsetY,
            X,
            Y
        );
        showResizers(gTag);
    }
}

function onMouseUp_Resizer(event) {
    selectedResizer = null;
}

function hideReziers() {
    if (curResizersTag) {
        curResizersTag.remove();
        curResizersTag = null;
    }
}
function showResizers(targetElement) {
    hideReziers();
    if (targetElement === null) return;
    const element = targetElement.querySelector(".selected");
    const resizers_g = document.createElementNS(ns, "g");
    resizers_g.classList.add("resizers");

    const reg = /translate\((.*?) (.*?)\) scale\((.*?) (.*?)\)/;
    const regResult = targetElement.getAttribute("transform").match(reg);
    const [translateX, translateY] = [regResult[1], regResult[2]].map((x) =>
        Number(x)
    );
    const [scaleX, scaleY] = [regResult[3], regResult[4]].map((x) => Number(x));
    const point = element.getPointAtLength(0);
    const [offsetX, offsetY] = [point.x * scaleX, point.y * scaleY];
    resizers_g.setAttribute(
        "transform",
        `translate(${offsetX + translateX} ${offsetY + translateY}) scale(1 1)`
    );

    const RESIZER_SIZE = 5;
    const SVGRect = element.getBBox();
    SVGRect.width *= scaleX;
    SVGRect.height *= scaleY;

    const resizer_RB = makeResizer(
        SVGRect.width,
        SVGRect.height,
        RESIZER_SIZE / ZOOM_VAL,
        "resizer_RB"
    );

    resizers_g.appendChild(resizer_RB);

    resizers_g.addEventListener("mousedown", onMouseDown_Resizer);
    document.addEventListener("mousemove", onMouseMove_Resizer);
    document.addEventListener("mouseup", onMouseUp_Resizer);

    board.appendChild(resizers_g);
    curResizersTag = resizers_g;
}
function selectNode(wrapper_g, event) {
    //event.target = real tag
    //element = top of g
    //임시로 구현 => 선택 시 resizers을 그린 g태그를 visible하게 바꿀것임
    text.value = wrapper_g.querySelector("text").innerHTML;
    font_size.value = wrapper_g.querySelector("text").getAttribute("font-size");
    selectedElement = wrapper_g;
    event.target.classList.add("selected");
    wrapper_g.clickOffsetX = event.clientX;
    wrapper_g.clickOffsetY = event.clientY;
    selectedElement_set.add(wrapper_g);

    board.removeChild(selectedElement);
    board.appendChild(selectedElement);

    _SetSeletedOffsets();
}
function deSelectNode(element) {
    selectedElement = null;

    element.querySelector(".selectable").classList.remove("selected");
    selectedElement_set.delete(element);
}
function deSelectNodeAll() {
    selectedElement = null;
    for (let target of selectedElement_set) {
        deSelectNode(target);
    }
}
function drawLines() {
    for (let x of LeaderLine_list) {
        x.remove();
    }
    LeaderLine_list = [];
    for (let [from, to] of from_to_list) {
        if (from === null || to === null) continue;
        let obj = new LeaderLine(from, to);
        LeaderLine_list.push(obj);
    }
}

function onMouseDown_Board(event) {
    //console.log("[MOUSE_DOWN_EVENT_TARGET]", event.target);
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    if (event.target === board) {
        console.log("[SELECTED_ELEMENT_SET CLEAR!]");
        deSelectNodeAll();
        hideReziers();

        link_btn.innerHTML = "link";
        isLinking = false;
        from_node = null;
        to_node = null;
    } else if (
        event.target.classList.contains("draggable") &&
        event.target.classList.contains("selectable")
    ) {
        // pick g tag
        const picked_g = event.target.parentNode;
        if (event.ctrlKey) {
            if (selectedElement_set.has(picked_g)) {
                deSelectNode(picked_g);
            } else {
                selectNode(picked_g, event);
            }
        } else {
            if (selectedElement_set.has(picked_g)) {
                selectNode(picked_g, event);
                showResizers(selectedElement);
            } else {
                deSelectNodeAll();
                selectNode(picked_g, event);
                showResizers(selectedElement);
            }
            if (isLinking) {
                if (from_node === null) {
                    from_node = picked_g;
                    link_btn.innerHTML = "select to node";
                } else {
                    to_node = picked_g;
                    let obj = new LeaderLine(from_node, to_node);
                    LeaderLine_list.push(obj);
                    from_to_list.push([from_node, to_node]);
                    link_btn.innerHTML = "link";
                    isLinking = false;
                    from_node = null;
                    to_node = null;
                    drawLines();
                }
            } else if (isDelLinking) {
                if (from_node === null) {
                    from_node = picked_g;
                    link_del_btn.innerHTML = "select to node";
                } else {
                    to_node = picked_g;
                    from_to_list = from_to_list.filter(
                        (x) => !(x[0] === from_node && x[1] === to_node)
                    );
                    link_del_btn.innerHTML = "DelLink";
                    isDelLinking = false;
                    from_node = null;
                    to_node = null;
                    drawLines();
                }
            }
        }
        isDragging = true;
    }
}

function onMouseMove_Board(event) {
    if (
        isDragging &&
        selectedElement_set.size > 0 &&
        selectedElement_set.has(selectedElement)
    ) {
        event.preventDefault();
        const [afterX, afterY] = [event.clientX, event.clientY];
        const deltaX = (afterX - selectedElement.clickOffsetX) / ZOOM_VAL;
        const deltaY = (afterY - selectedElement.clickOffsetY) / ZOOM_VAL;
        // console.log("[CUR_CURSOR]", event.clientX, event.clientY);
        // console.log(
        //     "[CLICK_NODE_OFFSET]",
        //     selectedElement.clickOffsetX,
        //     selectedElement.clickOffsetY
        // );
        // console.log("[DELTA]",deltaX, deltaY);
        for (let target of selectedElement_set) {
            const targetX = Number(target.translateOffsetX) + Number(deltaX);
            const targetY = Number(target.translateOffsetY) + Number(deltaY);

            const [snapX, snapY] = _SnapBoardSpace(targetX, targetY);
            _SetGtagTransform(
                target,
                snapX,
                snapY,
                target.scaleOffsetX,
                target.scaleOffsetY
            );
        }
        drawLines();
        if (curResizersTag) {
            showResizers(selectedElement);
        }
    }
}

function onMouseUp_Board(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    isDragging = false;

    if (creatingElement_g !== null) {
        const board_pos = _ViewPort2BoardSpace(event.clientX, event.clientY);
        const [snapX, snapY] = _SnapBoardSpace(board_pos.x, board_pos.y);
        _SetGtagTransform(
            creatingElement_g,
            snapX,
            snapY,
            creatingElement_g.scaleOffsetX,
            creatingElement_g.scaleOffsetY
        );
        creatingElement_g = null;
        selectedBox_svg = null;
    }
}

board.addEventListener("mousedown", onMouseDown_Board);
board.addEventListener("mousemove", onMouseMove_Board);
board.addEventListener("mouseup", onMouseUp_Board);

function makeResizer(cx, cy, r, className = "") {
    const resizer = document.createElementNS(ns, "circle");
    resizer.classList.add(className);
    resizer.setAttribute("cx", cx);
    resizer.setAttribute("cy", cy);
    resizer.setAttribute("r", r);

    return resizer;
}
function makeNode(
    element,
    parent = null,
    size = DEFAULT_NODE_SCALE,
    x = 0,
    y = 0
) {
    element.classList.add("draggable");
    element.classList.add("selectable");
    element.classList.add("resizable");

    const wrapper_g = document.createElementNS(ns, "g");
    const [snapX, snapY] = _SnapBoardSpace(x, y);
    _SetGtagTransform(wrapper_g, snapX, snapY, size, size);

    wrapper_g.translateOffsetX = Number(x);
    wrapper_g.translateOffsetY = Number(y);
    wrapper_g.scaleOffsetX = Number(size);
    wrapper_g.scaleOffsetY = Number(size);

    const text = document.createElementNS(ns, "text");
    text.setAttribute("alignment-baseline", "central");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", 7);

    wrapper_g.appendChild(element);
    wrapper_g.appendChild(text);
    parent.appendChild(wrapper_g);
    text.setAttribute("x", element.getBBox().width / 2);
    text.setAttribute("y", element.getBBox().height / 2);
    return wrapper_g;
}

function initItemBox(box) {
    function onMouseDown_ItemBox(event) {
        if (event.button !== LEFT_MOUSE_BUTTON) return;
        const element = event.currentTarget
            .querySelector(".item")
            .cloneNode(true);

        const board_pos = _ViewPort2BoardSpace(event.clientX, event.clientY);
        creatingElement_g = makeNode(
            element,
            board,
            DEFAULT_NODE_SCALE,
            board_pos.x,
            board_pos.y
        );
        creatingElement_g.clickOffsetX = event.clientX;
        creatingElement_g.clickOffsetY = event.clientY;
        selectedBox_svg = event.currentTarget;
    }
    function onMouseMove_ItemBox(event) {
        if (creatingElement_g) {
            _MoveGtag(
                creatingElement_g,
                event.clientX,
                event.clientY,
                creatingElement_g.clickOffsetX,
                creatingElement_g.clickOffsetY
            );
        }
    }

    function onMouseUp_ItemBox(event) {
        event.stopPropagation();
        if (event.button !== LEFT_MOUSE_BUTTON) return;
        if (event.currentTarget === selectedBox_svg) {
            const init_pos = _ViewPort2BoardSpace(
                mid_region.clientWidth / 2 +
                    left_region.clientWidth +
                    handler.clientWidth -
                    creatingElement_g.getBoundingClientRect().width / 2,
                mid_region.clientHeight / 2
            );

            const [snapX, snapY] = _SnapBoardSpace(init_pos.x, init_pos.y);
            _SetGtagTransform(
                creatingElement_g,
                snapX,
                snapY,
                creatingElement_g.scaleOffsetX,
                creatingElement_g.scaleOffsetY
            );
        } else {
            //When mouse up in Other box(trivial)
        }
        creatingElement_g = null;
        selectedBox_svg = null;
    }

    ///////////////////////////////////////////////////////////////

    box.addEventListener("mousedown", onMouseDown_ItemBox);
    document.addEventListener("mousemove", onMouseMove_ItemBox);
    box.addEventListener("mouseup", onMouseUp_ItemBox);
}
item_boxes.forEach(initItemBox);

//grab board
////////////////////////////////////////////////
const scrollable_div = board.parentElement;
let isGrabbing = false;
let std_board_pos = {};
function onWheelDown_Board(event) {
    event.preventDefault();
    if (event.button !== MIDDLE_MOUSE_BUTTON) return;
    //console.log("[WHEEL DOWN!]");
    std_board_pos.cur_scroll_top = scrollable_div.scrollTop;
    std_board_pos.cur_scroll_left = scrollable_div.scrollLeft;

    std_board_pos.x = event.clientX;
    std_board_pos.y = event.clientY;
    scrollable_div.style.cursor = "grabbing";
    scrollable_div.style.userSelect = "none";
    isGrabbing = true;
}

function onWheelPressMove_Board(event) {
    if (!isGrabbing) return;
    //console.log("[WHEEL_PRESSED_MOVE]");

    const dx = event.clientX - std_board_pos.x;
    const dy = event.clientY - std_board_pos.y;

    scrollable_div.scrollTop = std_board_pos.cur_scroll_top - dy;
    scrollable_div.scrollLeft = std_board_pos.cur_scroll_left - dx;
}

function onWheelUp_Board(event) {
    if (event.button !== MIDDLE_MOUSE_BUTTON) return;
    //console.log("[WHEEL UP]");

    isGrabbing = false;
    scrollable_div.style.cursor = "default";
    scrollable_div.style.removeProperty("user-select");
}
board.addEventListener("mousedown", onWheelDown_Board);
board.addEventListener("mousemove", onWheelPressMove_Board);
board.addEventListener("mouseup", onWheelUp_Board);

function onWheel_Board(event) {
    if (event.ctrlKey) {
        event.preventDefault();
        if (event.deltaY > 0) {
            ZOOM_VAL -= 0.1;
            board.style.zoom = ZOOM_VAL;
        } else if (event.deltaY < 0) {
            ZOOM_VAL += 0.1;
            board.style.zoom = ZOOM_VAL;
        }
        _SetSeletedOffsets();
        showResizers(selectedElement);
    }
    drawLines();
}
board.addEventListener("mousewheel", onWheel_Board);

function onKeyDownDel(event) {
    if (event.key === "Delete" && selectedElement_set.size > 0) {
        for (let target of selectedElement_set) {
            _DeleteGtag(target);
        }
        console.log("[DELETE FINISH]");
    }
}
document.addEventListener("keydown", onKeyDownDel);

function onChangeText(event) {
    selectedElement.querySelector("text").innerHTML = event.target.value;
}
text.addEventListener("change", onChangeText);

function onChangeFontSize(event) {
    selectedElement
        .querySelector("text")
        .setAttribute("font-size", event.target.value);
}
font_size.addEventListener("change", onChangeFontSize);

function onClickLinkBTN(event) {
    if (event.target.innerHTML === "link") {
        isLinking = true;
        event.target.innerHTML = "select from";
    }
}
link_btn.addEventListener("click", onClickLinkBTN);

function onClickLinkDelBTN(event) {
    isLinking = false;
    if (event.target.innerHTML === "DelLink") {
        isDelLinking = true;
        event.target.innerHTML = "select from";
    }
}
link_del_btn.addEventListener("click", onClickLinkDelBTN);
