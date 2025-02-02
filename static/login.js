;(() => {
    const p = '>'
    const out = document.querySelector('.output')
    const prompt = document.querySelector('.prompt')
    const names = ['mary24', '42-paul', 'raj', 'nancy', 'ChrIs', 'Jordan', 'alex', 'ilana', 'tracy', 'tracey', 'h4x0r', 'Jimmy-T', 'bubbaloo', '0r4c13', 'FunkyT0wn', 'RickSanchez', 'Hanz-g', 'bob', '1337-grl', 'tiny-tim', 'maryjane', 'tamagooch', 'myhandle']
    document.querySelector('.terminal form').addEventListener('submit', async (e) => {
        if (!prompt.value) {
            out.innerHTML += `<pre class='cmd'>${p} </p>`
            window.scrollTo(0, document.body.scrollHeight)
            e.preventDefault()
            return false
        }
        
        if (!/^[\w\-\.\']+\s.+$/.test(prompt.value)) {
            const creds = getUserAndPass()
            out.innerHTML += `<pre class='cmd'>${p} ${prompt.value}</p>`
            out.innerHTML += `<pre class='out user-error'>Please enter your handle and password, for example: ${creds.user} ${creds.pass}</p>`
            prompt.value = ''
            e.preventDefault()
            return false
        }
    })

    const creds = getUserAndPass()
    document.querySelector('.initial-creds').innerText = `${creds.user} ${creds.pass}`

    document.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'html') { prompt.focus() }
    })

    function getUserAndPass() {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*_-+='
        const count = Math.ceil(Math.random() * 8) + 6
        return {
            user: names[Math.floor(Math.random() * names.length)],
            pass: Array(count).fill(0, 0, count).map(() => chars[Math.floor(Math.random() * chars.length)]).join('')
        }
    }
})()