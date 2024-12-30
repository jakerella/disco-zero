;(() => {
    const history=[]
    let p = '>'
    let ck = 'ct'
    const ey = 'ey'
    const wh = 'which'
    let kc = 'k'
    let historyEntry = 0
    const prompt = document.querySelector('.prompt')
    const out = document.querySelector('.output')
    const form = document.querySelector('.terminal form')
    ck += 'rlK'
    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const input = prompt.value.trim()
        if (!input) {
            out.innerHTML += `<p class='cmd'>${p} </p>`
            window.scrollTo(0, document.body.scrollHeight)
            return
        }
        if (input === 'clear') {
            out.innerHTML = ''
            prompt.value = ''
            history.push(input)
            return
        }
        
        const resp = await fetch(`/cmd?c=${input}`, {
            headers: {
                'accept': 'text/plain'
            }
        })
        const content = await resp.text()
        let error = ''
        if (resp.status > 399) {
            error = ' error'
        }
        
        out.innerHTML += `<p class='cmd'>${p} ${input}</p>`
        prompt.value = ''
        out.innerHTML += `<p class='out${error}'>${content}</p>`

        window.scrollTo(0, document.body.scrollHeight)
        historyEntry = 0
        history.push(input)
    })
    kc += ey
    const cc = 2.8*24<<63%3
    ck += ey
    document.addEventListener('keyup', (e) => {
        if (e.keyCode === 38 || e.which === 38 || e.code === 'ArrowUp') {
            if (historyEntry < history.length) {
                historyEntry++
                prompt.value = history[history.length - historyEntry]
            }
        } else if (e[ck] && (e[wh] === cc || e[kc+'Code'] === cc)) {
            out.innerHTML += `<p class='cmd'>${p} </p>`
            p = '$'
            form.querySelector('label').innerText = `${p} `
            prompt.value = ''
        } else if (e.keyCode === 40 || e.which === 40 || e.code === 'ArrowDown') {
            historyEntry--
            if (historyEntry > 0) {
                prompt.value = history[history.length - historyEntry]
            } else {
                prompt.value = ''
            }
        }
    })

    document.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'html') { prompt.focus() }
    })
})()