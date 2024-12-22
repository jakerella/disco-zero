const p = document.querySelector('.prompt')
const o = document.querySelector('.output')
document.querySelector('.terminal form').addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!p.value) { return }
    const resp = await (await fetch(`/cmd?c=${p.value}`)).text()
    o.innerHTML += `<p class='cmd'>$ ${p.value}</p>`
    p.value = ''
    o.innerHTML += `<p class='out'>${resp}</p>`
})