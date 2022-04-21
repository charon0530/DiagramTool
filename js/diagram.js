"use strict";
const handler = document.querySelector(".handler");
const wrapper = document.querySelector(".contents");
const left_region = document.querySelector(".left_region");
const menus = document.querySelectorAll(".menu");
const item_boxes = document.querySelectorAll(".menu_item svg");
const mid_region = document.querySelector(".mid_region");
const board = document.querySelector(".board");
const MIN_WIDTH = 0;

const ns = "http://www.w3.org/2000/svg";
const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;

const DEFAULT_NODE_SCALE = 5;
const DEFAULT_SNAP_GAP = 10;
let ZOOM_VAL = 1;

//Drag Node
let selectedElement = null;
const selectedElement_set = new Set();
let isDragging = false;
/**********************************************************************************************/
let creatingElement_g = null;
let selectedBox_svg = null;

//Resizing left_region
let canResizing = false;
let clicked_Xpos = 0;

let curResizersTag = null;
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
    gTag.remove();
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
    } else if (creatingElement_g) {
        _MoveGtag(
            creatingElement_g,
            event.clientX,
            event.clientY,
            creatingElement_g.clickOffsetX,
            creatingElement_g.clickOffsetY
        );
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
function hideReziers() {
    if (curResizersTag) {
        curResizersTag.remove();
        curResizersTag = null;
    }
}
function showResizers(wrapper_g) {
    hideReziers();
    const element = selectedElement.querySelector(".selected");
    const resizers_g = document.createElementNS(ns, "g");
    resizers_g.classList.add("resizers");

    const point = element.getPointAtLength(0);
    const [offsetX, offsetY] = [point.x, point.y];
    resizers_g.setAttribute(
        "transform",
        `translate(${offsetX} ${offsetY}) scale(1 1)`
    );

    const SVGRect = element.getBBox();

    const resizer_T = makeResizer(SVGRect.width / 2, 0, 1);
    const resizer_R = makeResizer(SVGRect.width, SVGRect.height / 2, 1);
    const resizer_D = makeResizer(SVGRect.width / 2, SVGRect.height, 1);
    const resizer_L = makeResizer(0, SVGRect.height / 2, 1);
    //#endregion

    resizers_g.appendChild(resizer_T);
    resizers_g.appendChild(resizer_R);
    resizers_g.appendChild(resizer_D);
    resizers_g.appendChild(resizer_L);

    wrapper_g.appendChild(resizers_g);
    curResizersTag = resizers_g;
}
function selectNode(wrapper_g, event) {
    //event.target = real tag
    //element = top of g
    //임시로 구현 => 선택 시 resizers을 그린 g태그를 visible하게 바꿀것임
    selectedElement = wrapper_g;
    event.target.classList.add("selected");
    wrapper_g.clickOffsetX = event.clientX;
    wrapper_g.clickOffsetY = event.clientY;
    selectedElement_set.add(wrapper_g);

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

function onMouseDown_Board(event) {
    //console.log("[MOUSE_DOWN_EVENT_TARGET]",event.target);
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    if (event.target === board) {
        //console.log("[SELECTED_ELEMENT_SET CLEAR!]");
        deSelectNodeAll();
        hideReziers();
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
                showResizers(picked_g);
            } else {
                deSelectNodeAll();
                selectNode(picked_g, event);
                showResizers(picked_g);
            }
        }

        if (selectedElement) {
            board.removeChild(selectedElement);
            board.appendChild(selectedElement);
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
    }
}

function onMouseUp_Board(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    isDragging = false;

    if (creatingElement_g !== null) {
        const board_pos = _ViewPort2BoardSpace(event.clientX, event.clientY);
        const [snapX, snapY] = _SnapBoardSpace(board_pos.x, board_pos.y);
        console.log(board_pos);
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

function makeResizer(cx, cy, r) {
    const resizer = document.createElementNS(ns, "circle");
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

    wrapper_g.appendChild(element);
    parent.appendChild(wrapper_g);

    return wrapper_g;
}

function initItemBox(box) {
    function onMouseDown_ItemBox(event) {
        console.log(event.currentTarget);
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
        console.log(selectedBox_svg);
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
    box.addEventListener("mouseup", onMouseUp_ItemBox);
}
item_boxes.forEach(initItemBox);

board.addEventListener("mousedown", onMouseDown_Board);
board.addEventListener("mousemove", onMouseMove_Board);
board.addEventListener("mouseup", onMouseUp_Board);

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
    }
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
