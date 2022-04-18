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

const DEFAULT_NODE_SCALE = 2.5;
let ZOOM_VAL = 1;

//Drag Node
let selectedElement = null;
const selectedElement_set = new Set();
let selectedOffset = {};
let isDragging = false;
///////////////////////////

//Resizing left_region
let canResizing = false;
let clicked_Xpos = 0;
//////////////////////////
document.addEventListener("mousedown", (event) => {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    if (event.target !== handler) return;
    clicked_Xpos = event.clientX - handler.getBoundingClientRect().left;
    canResizing = true;
});

document.addEventListener("mousemove", (event) => {
    if (canResizing === false) return false;

    let pointerRelativeXpos = event.clientX - clicked_Xpos;
    left_region.style.width = Math.max(MIN_WIDTH, pointerRelativeXpos) + "px";
    left_region.style.flexGrow = 0;
});

document.addEventListener("mouseup", (event) => {
    if (event.button !== LEFT_MOUSE_BUTTON) return;

    canResizing = false;
});
/////////////////////////////////////////////////////////////////////
menus.forEach((menu) => {
    menu.addEventListener("click", function (event) {
        if (event.button !== LEFT_MOUSE_BUTTON) return;

        event.stopPropagation();
        event.currentTarget.parentNode.children[1].classList.toggle("active");
    });
});
/////////////////////////////////////////////////////////////////////
function onMouseDownDragHandler(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    if (event.target === board) {
        console.log("do");
        selectedElement = null;
        selectedElement_set.clear();
    } else if (event.target.classList.contains("draggable")) {
        selectedElement = event.target.parentNode.parentNode;

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

        console.log(selectedElement_set);

        board.removeChild(selectedElement);

        for (let se of selectedElement_set) {
            se.selectedOffset = _ViewPort2BoardSpace(
                event.clientX,
                event.clientY
            );
            se.selectedOffset.x -= se.getAttribute("x");
            se.selectedOffset.y -= se.getAttribute("y");
        }

        board.appendChild(selectedElement);
        isDragging = true;
    }
}
function onMouseMoveDragHandler(event) {
    if (
        isDragging &&
        selectedElement_set.size > 0 &&
        selectedElement_set.has(event.target.parentNode.parentNode)
    ) {
        event.preventDefault();
        for (let se of selectedElement_set) {
            let coord = _ViewPort2BoardSpace(event.clientX, event.clientY);
            se.setAttribute("x", coord.x - se.selectedOffset.x);
            se.setAttribute("y", coord.y - se.selectedOffset.y);
        }
    }
}
function onMouseUpDragHandler(event) {
    if (event.button !== LEFT_MOUSE_BUTTON) return;
    isDragging = false;
    //selectedElement = null;
}
function _ViewPort2BoardSpace(clientX, clientY) {
    const CTM = board.getScreenCTM();

    return {
        x: (clientX - CTM.e) / CTM.a,
        y: (clientY - CTM.f) / CTM.d,
    };
}

function makeDraggableWrapperNode(
    element,
    parent = null,
    size = 5.0,
    x = 0,
    y = 0
) {
    element.classList.add("draggable");
    const wrapper_g = document.createElementNS(ns, "g");

    wrapper_g.setAttribute("transform", `scale(${size})`);
    const wrapper_svg = document.createElementNS(ns, "svg");
    wrapper_g.appendChild(element);
    wrapper_svg.appendChild(wrapper_g);
    wrapper_svg.setAttribute("x", x);
    wrapper_svg.setAttribute("y", y);
    parent.appendChild(wrapper_svg);
    return wrapper_svg;
}
pad_items.forEach((item) => {
    item.addEventListener("click", function (event) {
        if (event.button !== LEFT_MOUSE_BUTTON) return;
        const element = event.currentTarget
            .querySelector("rect,path")
            .cloneNode(true);

        const wrapper_svg = makeDraggableWrapperNode(
            element,
            board,
            DEFAULT_NODE_SCALE
        );

        console.log(
            "[element's getBoundingClient]",
            element.getBoundingClientRect()
        );
        const create_position = _ViewPort2BoardSpace(
            mid_region.clientWidth / 2 +
                left_region.clientWidth +
                handler.clientWidth -
                element.getBoundingClientRect().width / 2,
            mid_region.clientHeight / 2
        );
        wrapper_svg.setAttribute("x", create_position.x);
        wrapper_svg.setAttribute("y", create_position.y);
    });
});

board.addEventListener("mousedown", onMouseDownDragHandler);
board.addEventListener("mousemove", onMouseMoveDragHandler);
board.addEventListener("mouseup", onMouseUpDragHandler);

//grab board
////////////////////////////////////////////////
const scrollable_div = board.parentElement;
let isGrabbing = false;
let std_board_pos = {};
function wheelDownHandler(event) {
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

function wheelMoveHandler(event) {
    if (!isGrabbing) return;
    console.log("wheel move");

    const dx = event.clientX - std_board_pos.x;
    const dy = event.clientY - std_board_pos.y;

    scrollable_div.scrollTop = std_board_pos.cur_scroll_top - dy;
    scrollable_div.scrollLeft = std_board_pos.cur_scroll_left - dx;
}

function wheelUpHandler(event) {
    if (event.button !== MIDDLE_MOUSE_BUTTON) return;
    console.log("wheel up");

    isGrabbing = false;
    scrollable_div.style.cursor = "default";
    scrollable_div.style.removeProperty("user-select");
}
board.addEventListener("mousedown", wheelDownHandler);
board.addEventListener("mousemove", wheelMoveHandler);
board.addEventListener("mouseup", wheelUpHandler);

function ctrlWheelHandler(event) {
    if (event.ctrlKey) {
        event.preventDefault();

        //올리면 마이너스
        if (event.deltaY > 0) {
            ZOOM_VAL -= 0.1;
            board.style.zoom = ZOOM_VAL;
        } else if (event.deltaY < 0) {
            ZOOM_VAL += 0.1;
            board.style.zoom = ZOOM_VAL;
        }
    }
}
board.addEventListener("mousewheel", ctrlWheelHandler);
