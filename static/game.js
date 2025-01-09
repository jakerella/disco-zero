;(() => {
    let ck = 'ct'
    const out = document.querySelector('.output')
    const wh = 'which'
    const history = JSON.parse(localStorage.getItem('disco_history') || '[]')
    const ey = 'ey'
    const form = document.querySelector('.terminal form')
    let kc = 'k'
    let historyEntry = 0
    const prompt = document.querySelector('.prompt')
    ck += 'rlK'
    const label = form.querySelector('label')
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const input = prompt.value.trim()
        if (!input) {
            out.innerHTML += `<p class='cmd'>${label.innerText}</p>`
            window.scrollTo(0, document.body.scrollHeight)
            return
        }
        if (input === 'clear') {
            out.innerHTML = ''
            prompt.value = ''
            history.push(input)
            return
        }

        out.innerHTML += `<p class='cmd'>${label.innerText} ${input}</p>`
        prompt.value = ''
        
        const resp = await fetch(`/cmd?c=${input}`, {
            headers: { 'accept': 'text/plain' }
        })
        if (resp.redirected) {
            return window.location.replace(resp.url)
        }

        const content = await resp.text()
        let error = ''
        if (resp.status > 499) {
            error = ' error'
        } else if (resp.status > 399) {
            error = ' user-error'
        }

        label.innerText = `${(resp.headers.get('X-Disco-Action') === 'convo') ? '-' : '>'} `
        
        const node = document.createElement('p')
        node.classList.add('out')
        if (error) { node.classList.add('error') }
        out.appendChild(node)
        typeOutput(node, content)

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
        // } else if (e[ck] && (e[wh] === cc || e[kc+'Code'] === cc)) {
        //     out.innerHTML += `<p class='cmd'>${p} </p>`
        //     p = '$'
        //     form.querySelector('label').innerText = `${p} `
        //     prompt.value = ''
        } else if (e.keyCode === 40 || e.which === 40 || e.code === 'ArrowDown') {
            historyEntry--
            if (historyEntry > 0) {
                prompt.value = history[history.length - historyEntry]
            } else {
                prompt.value = ''
            }
        }
    })

    function typeOutput(node, text) {
        const char = text[0]
        node.innerText += (char === ' ') ? ` ${text[1]}` : char
        if (text.length > 1) {
            setTimeout(() => {
                typeOutput(node, (char === ' ') ? text.substring(2) : text.substring(1))
            }, Math.floor(Math.random() * 40) + 15)
        }
    }

    window.addEventListener('beforeunload', () => {
        localStorage.setItem('disco_history', JSON.stringify(history.slice(0, 100)))
    })

    document.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'html') { prompt.focus() }
    })
})()