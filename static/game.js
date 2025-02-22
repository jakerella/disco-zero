;(() => {
    const out = document.querySelector('.output')
    const history = JSON.parse(localStorage.getItem('cmd_history') || '[]')
    const form = document.querySelector('.terminal form')
    let historyEntry = 0
    const prompt = document.querySelector('.prompt')
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
            const outNode = document.querySelector('.output pre.out:last-child')
            outNode.innerText = currentOutput
            currentOutput = null
            typingHandler = null
            makeLinks(outNode)
        }

        const input = prompt.value.trim()
        if (!input) {
            out.innerHTML += `<pre class='cmd'>${label.innerText}</p>`
            window.scrollTo(0, document.body.scrollHeight)
            return
        }
        if (input === 'clear') {
            out.innerHTML = ''
            prompt.value = ''
            history.push(input)
            return
        }

        out.innerHTML += `<pre class='cmd'>${label.innerText} ${input}</p>`
        prompt.value = ''
        historyEntry = 0
        history.push(input)
        
        const headers = { 'accept': 'text/plain' }
        if (passHandler) {
            headers[`X-${APP_NAME}-action`] = passHandler
            passHandler = null
        }

        let resp = null
        try {
            resp = await fetch(`/cmd?c=${input}`, { headers })
        } catch(err) {
            console.warn(err)
            const node = document.createElement('pre')
            node.classList.add('out')
            node.classList.add('error')
            out.appendChild(node)
            currentOutput = 'Sorry, there\'s a problem with the server.'
            typeOutput(node, currentOutput)
            return
        }

        if (resp.redirected) {
            return window.location.replace(resp.url)
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
            const node = document.createElement('pre')
            node.classList.add('out')
            if (resp.status > 399) { node.classList.add('error') }
            out.appendChild(node)

            currentOutput = content
            typeOutput(node, content)
            window.scrollTo(0, document.body.scrollHeight)
        }
    })
    document.addEventListener('keyup', (e) => {
        if (e.keyCode === 38 || e.which === 38 || e.code === 'ArrowUp') {
            if (historyEntry < history.length) {
                historyEntry++
                prompt.value = history[history.length - historyEntry]
            }
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
        console.log(`typing output: ${text}`)
        if (text?.trim()) {
            const char = text[0]
            node.innerText += (char === ' ' && text[1]) ? ` ${text[1]}` : char
            if (text.length > 1) {
                typingHandler = setTimeout(() => {
                    typeOutput(node, (char === ' ') ? text.substring(2) : text.substring(1))
                }, Math.floor(Math.random() * 40) + 15)
            } else {
                makeLinks(node)
            }
        } else {
            makeLinks(node)
        }
    }

    window.addEventListener('beforeunload', () => {
        localStorage.setItem('cmd_history', JSON.stringify(history.slice(-100)))
    })
    document.addEventListener('click', (e) => {
        const t = e.target.tagName.toLowerCase()
        if (t === 'html' || t === 'body' || t === 'img') { prompt.focus() }
    })
    document.querySelector('.bg').addEventListener('contextmenu', (e) => {
        e.preventDefault()
        return false
    })

    function makeLinks(node) {
        node.innerHTML = node.innerText.replaceAll(/(https?:\/\/[^\s\'\"]+)/g, '<a href="$1" target="_blank">$1</a>')
    }
})()