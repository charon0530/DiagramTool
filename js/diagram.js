const handler = document.querySelector(".handler");
const wrapper = document.querySelector(".contents");
const left_region = document.querySelector(".left_region");
const menus = document.querySelectorAll(".menu");
const pad_items = document.querySelectorAll(".menu_item svg g");
const mid_region = document.querySelector(".mid_region");
const board = document.querySelector(".board");
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
        console.log(event.currentTarget.querySelector("rect,path"));

        const element = event.currentTarget
            .querySelector("rect,path")
            .cloneNode(true);

        element.classList.add("draggable");

        //element.setAttribute("width", element.getAttribute("width") * 5);
        //element.setAttribute("height", element.getAttribute("height") * 5);

        console.log("fff", element.getBoundingClientRect());

        //element.setAttribute("x", create_position.x);
        //element.setAttribute("y", create_position.y);

        board.addEventListener("mousedown", onMouseDown);
        board.addEventListener("mousemove", onMouseMove);
        board.addEventListener("mouseup", onMouseUp);
        board.addEventListener("mouseleave", onMouseLeave);

        const wrapper_g = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );
        wrapper_g.setAttribute("transform", "scale(5.0)");

        const wrapper_svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );

        wrapper_g.appendChild(element);
        wrapper_svg.appendChild(wrapper_g);
        board.appendChild(wrapper_svg);
        console.log("fff", element.getBoundingClientRect());
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

    function onMouseDown(event) {
        console.log(event.target.parentNode.parentNode);

        if (event.target.classList.contains("draggable")) {
            selectedElement = event.target.parentNode.parentNode;
            board.removeChild(selectedElement);
            selectedOffset = _ViewPort2BoardSpace(event.clientX, event.clientY);
            selectedOffset.x -= selectedElement.getAttribute("x");
            selectedOffset.y -= selectedElement.getAttribute("y");
            board.appendChild(selectedElement);
        }
    }
    function onMouseMove(event) {
        if (selectedElement !== null) {
            event.preventDefault();
            let coord = _ViewPort2BoardSpace(event.clientX, event.clientY);
            selectedElement.setAttribute("x", coord.x - selectedOffset.x);
            selectedElement.setAttribute("y", coord.y - selectedOffset.y);
        }
    }
    function onMouseUp(event) {
        selectedElement = null;
    }
    function onMouseLeave(event) {}
    function _ViewPort2BoardSpace(clientX, clientY) {
        const CTM = board.getScreenCTM();

        return {
            x: (clientX - CTM.e) / CTM.a,
            y: (clientY - CTM.f) / CTM.d,
        };
    }
});
//dom point로 좌표변환 다시하기
