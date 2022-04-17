const handler = document.querySelector(".handler");
const wrapper = document.querySelector(".contents");
const left_region = document.querySelector(".left_region");
const menus = document.querySelectorAll(".menu");
const MIN_WIDTH = 0;

let canResizing = false;
let clicked_Xpos = 0;
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
        event.currentTarget.parentNode.childNodes[3].classList.toggle("active");
    });
});
