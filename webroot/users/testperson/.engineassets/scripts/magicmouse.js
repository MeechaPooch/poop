class MagicMouse {
    target;
    mousedown;

    addEventListeners() {
        window.addEventListener('mousemove', (e) => {
            this.target = e.target
        })
        window.addEventListener('mousedown', (e) => {
            this.mousedown = true
            console.log('magicmouse down')
        })
        window.addEventListener('mouseup', (e) => {
            this.mousedown = false
        })
    }
}
window.magicmouse = new MagicMouse()
magicmouse.addEventListeners()

console.log('magicmouse loaded')