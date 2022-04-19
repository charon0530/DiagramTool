const handler = document.querySelector(".handler");
const wrapper = document.querySelector(".contents");
const left_region = document.querySelector(".left_region");
const menus = document.querySelectorAll(".menu");
const pad_items = document.querySelectorAll(".menu_item svg g");
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
///////////////////////////

//Resizing left_region
let canResizing = false;
let clicked_Xpos = 0;
//////////////////////////
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

function onMouseDown_Handler(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    if (event.target !== handler) return;
    clicked_Xpos = event.clientX - handler.getBoundingClientRect().left;
    canResizing = true;
}
function onMouseMove_Handler(event) {
    if (canResizing === false) return false;
    let pointerRelativeXpos = event.clientX - clicked_Xpos;
    left_region.style.width = Math.max(MIN_WIDTH, pointerRelativeXpos) + "px";
    left_region.style.flexGrow = 0;
}
function onMouseUp_Handler(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    canResizing = false;
}
document.addEventListener("mousedown", onMouseDown_Handler);
document.addEventListener("mousemove", onMouseMove_Handler);
document.addEventListener("mouseup", onMouseUp_Handler);
/////////////////////////////////////////////////////////////////////
function onClick_Menu(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    event.stopPropagation();
    event.currentTarget.parentNode.children[1].classList.toggle("active");
}

menus.forEach((menu) => {
    menu.addEventListener("click", onClick_Menu);
});
/////////////////////////////////////////////////////////////////////
function onMouseDown_Board(event) {
    console.log(event.target);
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    if (event.target === board) {
        console.log("[selectedElement_set Clear!]");
        selectedElement = null;
        selectedElement_set.clear();
    } else if (event.target.classList.contains("draggable")) {
        selectedElement = event.target.parentNode;
        selectedElement.clickOffsetX = event.clientX;
        selectedElement.clickOffsetY = event.clientY;

        if (event.ctrlKey) {
            if (selectedElement_set.has(selectedElement)) {
                selectedElement_set.delete(selectedElement);
            } else {
                selectedElement_set.add(selectedElement);
            }
        } else {
            if (selectedElement_set.has(selectedElement)) {
                //
            } else {
                selectedElement_set.clear();
                selectedElement_set.add(selectedElement);
            }
        }

        _setSeletedOffsets();

        console.log("tttt", selectedElement);
        board.removeChild(selectedElement);

        board.appendChild(selectedElement);
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

        for (let target of selectedElement_set) {
            const targetX = Number(target.translateOffsetX) + Number(deltaX);
            const targetY = Number(target.translateOffsetY) + Number(deltaY);
            const [snapX, snapY] = _SnapBoardSpace(targetX, targetY);
            target.setAttribute(
                "transform",
                `translate(${snapX} ${snapY}) scale(${target.scaleOffsetX} ${target.scaleOffsetY})`
            );
        }
    }
}

function onMouseUp_Board(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    isDragging = false;
}

function _setSeletedOffsets() {
    const reg = /translate\((.*?) (.*?)\) scale\((.*?) (.*?)\)/;

    for (let target of selectedElement_set) {
        const regResult = target.getAttribute("transform").match(reg);
        console.log("[reg]", regResult);
        const [translateX, translateY] = [regResult[1], regResult[2]];
        const [scaleX, scaleY] = [regResult[3], regResult[4]];

        target.translateOffsetX = Number(translateX);
        target.translateOffsetY = Number(translateY);
        target.scaleOffsetX = Number(scaleX);
        target.scaleOffsetY = Number(scaleY);
    }
}

function makeDraggableWrapper(
    element,
    parent = null,
    size = DEFAULT_NODE_SCALE,
    x = 0,
    y = 0
) {
    element.classList.add("draggable");
    const wrapper_g = document.createElementNS(ns, "g");
    const [snapX, snapY] = _SnapBoardSpace(x, y);
    wrapper_g.setAttribute(
        "transform",
        `translate(${snapX} ${snapY}) scale(${size} ${size})`
    );
    wrapper_g.translateOffsetX = Number(x);
    wrapper_g.translateOffsetY = Number(y);
    wrapper_g.scaleOffsetX = Number(size);
    wrapper_g.scaleOffsetY = Number(size);

    wrapper_g.appendChild(element);
    parent.appendChild(wrapper_g);

    return wrapper_g;
}

pad_items.forEach((item) => {
    item.addEventListener("click", function (event) {
        if (event.button !== LEFT_MOUSE_BUTTON) return;
        const element = event.currentTarget
            .querySelector("rect,path")
            .cloneNode(true);

        const g = makeDraggableWrapper(element, board, DEFAULT_NODE_SCALE);

        const init_pos = _ViewPort2BoardSpace(
            mid_region.clientWidth / 2 +
                left_region.clientWidth +
                handler.clientWidth -
                g.getBoundingClientRect().width / 2,
            mid_region.clientHeight / 2
        );

        const [snapX, snapY] = _SnapBoardSpace(init_pos.x, init_pos.y);
        g.setAttribute(
            "transform",
            `translate(${snapX} ${snapY}) scale(${g.scaleOffsetX} ${g.scaleOffsetY})`
        );
    });
});

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
    console.log("wheel down");
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
    console.log("wheel move");

    const dx = event.clientX - std_board_pos.x;
    const dy = event.clientY - std_board_pos.y;

    scrollable_div.scrollTop = std_board_pos.cur_scroll_top - dy;
    scrollable_div.scrollLeft = std_board_pos.cur_scroll_left - dx;
}

function onWheelUp_Board(event) {
    if (event.button !== MIDDLE_MOUSE_BUTTON) return;
    console.log("wheel up");

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
        _setSeletedOffsets();
    }
}
board.addEventListener("mousewheel", onWheel_Board);
