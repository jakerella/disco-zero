;(() => {
    let ck = 'ct'
    const out = document.querySelector('.output')
    const wh = 'which'
    const history = JSON.parse(localStorage.getItem('cmd_history') || '[]')
    const ey = 'ey'
    const form = document.querySelector('.terminal form')
    let kc = 'k'
    let historyEntry = 0
    const prompt = document.querySelector('.prompt')
    ck += 'rlK'
    const label = form.querySelector('label')
    let currentOutput = null
    let typingHandler = null
    let passHandler = null
    
    form.addEventListener('submit', async (e) => {
        if (document.location.pathname !== '/') {
            return true
        }
        e.preventDefault()

        if (typingHandler) {
            clearTimeout(typingHandler)
            const outNode = document.querySelector('.output p.out:last-child')
            outNode.innerText = currentOutput
            currentOutput = null
            typingHandler = null
        }

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
        historyEntry = 0
        history.push(input)
        
        const headers = { 'accept': 'text/plain' }
        if (passHandler) {
            headers[`X-${APP_NAME}-action`] = passHandler
            passHandler = null
        }

        const resp = await fetch(`/cmd?c=${input}`, { headers })
        if (resp.redirected) {
            return window.location.replace(resp.url)
        }
        
        let error = ''
        if (resp.status > 499) {
            error = ' error'
        } else if (resp.status > 399) {
            error = ' user-error'
        }

        const disposition = resp.headers.get('Content-Disposition')
        if (/^attachment/.test(disposition)) {
            const [_, filename, __] = disposition.split('"')
            const dataUrl = window.URL.createObjectURL(await resp.blob())
            var a = document.createElement('a')
            a.href = dataUrl
            a.download = filename || 'file.txt'
            document.body.appendChild(a)
            a.click()
            a.remove()

        } else {
            const content = await resp.text()
            const actionHeader = resp.headers.get(`X-${APP_NAME}-Action`) || null

            passHandler = (/^PASSWORD\|/.test(actionHeader)) ? actionHeader : null
            label.innerText = `${(actionHeader === 'convo' || /^PASSWORD\|/.test(actionHeader)) ? '-' : '>'} `
            const node = document.createElement('p')
            node.classList.add('out')
            if (error) { node.classList.add('error') }
            out.appendChild(node)

            currentOutput = content
            typeOutput(node, content)
            window.scrollTo(0, document.body.scrollHeight)
        }
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
            typingHandler = setTimeout(() => {
                typeOutput(node, (char === ' ') ? text.substring(2) : text.substring(1))
            }, Math.floor(Math.random() * 40) + 15)
        }
    }

    window.addEventListener('beforeunload', () => {
        localStorage.setItem('cmd_history', JSON.stringify(history.slice(-100)))
    })

    document.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'html') { prompt.focus() }
    })
})()