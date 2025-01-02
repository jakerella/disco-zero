;(() => {
    const p = '>'
    let handle = null
    const out = document.querySelector('.output')
    const prompt = document.querySelector('.prompt')
    document.querySelector('.terminal form').addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const input = prompt.value.trim()
        if (!input) {
            out.innerHTML += `<p class='cmd'>${p} </p>`
            window.scrollTo(0, document.body.scrollHeight)
            return
        }

        if (!handle) {
            handle = input.trim().replaceAll(/[^a-z0-9\-\.\'\s]/g, '').split(' ')[0]
            out.innerHTML += `<p class='cmd'>${p} ${input}</p>`
            out.innerHTML += `<p class='out'>Okay, your handle will be ${handle} ... Is that right?</p>`
            prompt.value = ''
            return
        }
        
        if (['yes', 'y', 'yep', 'yeah', 'yea', 'correct', 'right', 'indeed'].includes(input)) {
            const id = document.querySelector('.user_id').value.trim()
            console.debug('registering handle:', handle, id)

            const resp = await fetch(`/r/${id}/${handle}`, {
                headers: {
                    'accept': 'text/plain'
                }
            })
            if (resp.status < 300) {
                return window.location.replace('/')
            } else {
                const content = await resp.text()
                let errorClass = 'user-error'
                if (resp.status != 400) {
                    errorClass = 'error'
                }
                out.innerHTML += `<p class='cmd'>${p} ${input}</p>`
                prompt.value = ''
                out.innerHTML += `<p class='out ${errorClass}'>${content}</p>`
            }

        } else if (['no', 'n', 'nah', 'nope', 'incorrect', 'wrong', 'cancel'].includes(input)) {
            handle = null
            out.innerHTML += `<p class='cmd'>${p} ${input}</p>`
            out.innerHTML += `<p class='out'>What's your handle?</p>`
            prompt.value = ''
        } else {
            out.innerHTML += `<p class='cmd'>${p} ${input}</p>`
            out.innerHTML += `<p class='out user-error'>Sorry, I don't understand. Do you want ${handle} to be your handle?</p>`
            prompt.value = ''
        }
    })

    document.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'html') { prompt.focus() }
    })
})()