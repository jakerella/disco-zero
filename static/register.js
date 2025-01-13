;(() => {
    const p = '>'
    let handle = null
    const out = document.querySelector('.output')
    const prompt = document.querySelector('.prompt')
    const handleInput = document.querySelector('[name="handle"]')
    document.querySelector('.terminal form').addEventListener('submit', async (e) => {
        if (!prompt.value) {
            out.innerHTML += `<p class='cmd'>${p} </p>`
            window.scrollTo(0, document.body.scrollHeight)
            e.preventDefault()
            return false
        }

        out.innerHTML += `<p class='cmd'>${p} ${prompt.value}</p>`

        if (!handle) {
            handle = prompt.value.trim().replaceAll(/[^a-z0-9\-\.\'\s]/ig, '').replaceAll(/\s/g, '-').substring(0, 30)
            if (handle) {
                out.innerHTML += `<p class='out'>Okay, your handle will be "${handle}". Is that right?</p>`
            } else {
                out.innerHTML += `<p class='out user-error'>Sorry, but you need to enter a valid handle.</p>`
            }
            prompt.value = ''
            e.preventDefault()
            return false
        }
        
        if (!handleInput.value) {
            if (['yes', 'y', 'yep', 'yup', 'yeah', 'yea', 'okay', 'ok', 'correct', 'right', 'indeed'].includes(prompt.value.toLowerCase())) {
                handleInput.value = handle
                out.innerHTML += `<p class='out'>Please enter a personal identification number (PIN) for your user account. (Digits only please.)</p>`

            } else if (['no', 'n', 'nah', 'nope', 'incorrect', 'wrong', 'cancel'].includes(prompt.value.toLowerCase())) {
                handle = null
                handleInput.value = ''
                out.innerHTML += `<p class='out'>What would you like your handle to be?</p>`
            } else {
                out.innerHTML += `<p class='out user-error'>Sorry, I don't understand. Do you want ${handle} to be your handle?</p>`
            }
            prompt.value = ''
            e.preventDefault()
            return false
        }
        
        if (!/^[0-9]+$/.test(prompt.value)) {
            out.innerHTML += `<p class='out user-error'>Sorry, but you need to enter a valid PIN (digits only).</p>`
            prompt.value = ''
            e.preventDefault()
            return false
        }
        // Form will now submit...
    })

    document.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'html') { prompt.focus() }
    })
})()