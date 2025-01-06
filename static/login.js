;(() => {
    const p = '>'
    const out = document.querySelector('.output')
    const prompt = document.querySelector('.prompt')
    const names = ['mary24', '42-paul', 'raj', 'nancy', 'ChrIs', 'Jordan', 'alex', 'ss-jk', 'ilana', 'tracy', 'tracey', 'h4x0r', 'Jimmy-T', 'bubbaloo', '0r4c13', 'FunkyT0wn', 'RickSanchez', 'Hanz-g']
    document.querySelector('.terminal form').addEventListener('submit', async (e) => {
        if (!prompt.value) {
            out.innerHTML += `<p class='cmd'>${p} </p>`
            window.scrollTo(0, document.body.scrollHeight)
            e.preventDefault()
            return false
        }
        
        if (!/^\w+\s[0-9]+$/.test(prompt.value)) {
            const name = names[Math.floor(Math.random() * names.length)]
            const pin = Math.ceil(Math.random() * 8) * Math.ceil(Math.random() * 37915)
            out.innerHTML += `<p class='cmd'>${p} ${prompt.value}</p>`
            out.innerHTML += `<p class='out user-error'>Please enter your handle and PIN, for example: ${name} ${pin}</p>`
            prompt.value = ''
            e.preventDefault()
            return false
        }
    })

    document.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'html') { prompt.focus() }
    })
})()