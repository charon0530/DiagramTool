const handler = document.querySelector(".handler");
const wrapper = document.querySelector(".contents");
const left_region = document.querySelector(".left_region");
const menus = document.querySelectorAll(".menu");
const pad_items = document.querySelectorAll(".menu_item svg");
const board = document.querySelector(".mid_region");
const MIN_WIDTH = 0;

//Drag Node
let selectedElement = null;
let selectedOffset = {};
///////////////////////////

//Resizing left_region
let canResizing = false;
let clicked_Xpos = 0;
//////////////////////////
document.addEventListener("mousedown", (event) => {
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

document.addEventListener("mouseup", (evnet) => {
    canResizing = false;
});

menus.forEach((menu) => {
    menu.addEventListener("click", function (event) {
        event.stopPropagation();
        event.currentTarget.parentNode.children[1].classList.toggle("active");
    });
});

pad_items.forEach((item) => {
    item.addEventListener("click", function (event) {
        const element = event.currentTarget.children[0].cloneNode(true);
        element.setAttribute("width", element.getAttribute("width") * 5);
        element.setAttribute("height", element.getAttribute("height") * 5);
        element.classList.add("draggable");
        element.setAttribute("x", 0);
        element.setAttribute("y", 0);

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("mouseleave", onMouseLeave);

        board.appendChild(element);
    });

    function onMouseDown(event) {
        if (event.target.classList.contains("draggable")) {
            selectedElement = event.target;
            selectedOffset = _ViewPort2BoardSpace(event);
            console.log(selectedOffset);
            selectedOffset.x -= selectedElement.getAttribute("x");
            selectedOffset.y -= selectedElement.getAttribute("y");
        }
    }
    function onMouseMove(event) {
        if (selectedElement !== null) {
            event.preventDefault();
            let coord = _ViewPort2BoardSpace(event);
            console.log(selectedOffset.x);
            selectedElement.setAttribute("x", coord.x - selectedOffset.x);
            selectedElement.setAttribute("y", coord.y - selectedOffset.y);
        }
    }
    function onMouseUp(event) {
        selectedElement = null;
    }
    function onMouseLeave(event) {}
    function _ViewPort2BoardSpace(event) {
        const CTM = board.getScreenCTM();

        return {
            x: (event.clientX - CTM.e) / CTM.a,
            y: (event.clientY - CTM.f) / CTM.d,
        };
    }
});
