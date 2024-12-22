;(() => {
    const history = []
    let historyEntry = 0;
    const p = document.querySelector('.prompt')
    const o = document.querySelector('.output')
    document.querySelector('.terminal form').addEventListener('submit', async (e) => {
        e.preventDefault()
        const input = p.value.trim()
        if (!input) {
            o.innerHTML += `<p class='cmd'>$ </p>`
            window.scrollTo(0, document.body.scrollHeight)
            return
        }
        if (input === 'clear') {
            o.innerHTML = '';
            p.value = ''
            history.push(input)
            return
        }
        const resp = await (await fetch(`/cmd?c=${input}`)).text()
        o.innerHTML += `<p class='cmd'>$ ${input}</p>`
        p.value = ''
        o.innerHTML += `<p class='out'>${resp}</p>`
        window.scrollTo(0, document.body.scrollHeight)
        historyEntry = 0
        history.push(input)
    })

    document.addEventListener('keyup', (e) => {
        if (e.keyCode === 38 || e.which === 38 || e.code === 'ArrowUp') {
            if (historyEntry < history.length) {
                historyEntry++;
                p.value = history[history.length - historyEntry]
            }
        } else if (e.keyCode === 40 || e.which === 40 || e.code === 'ArrowDown') {
            historyEntry--;
            if (historyEntry > 0) {
                p.value = history[history.length - historyEntry]
            } else {
                p.value = ''
            }
        }
    })

    // TODO: add ctrl+c handling?
})()