;(() => {
    const leaderboardNode = document.querySelector('.leaderboard')
    const charts = ['location', 'item', 'npc'].map((t) => {
        return {
            name: `${t}Stats`,
            nodes: { disc: document.querySelector(`.${t}-discovered`), chart: document.querySelector(`.${t}-chart`) }
        }
    })

    getLatest()

    async function getLatest() {
        console.debug('Getting latest stats...')
        const resp = await fetch('/dashboard/stats')
        if (resp.status < 300) {
            const stats = await resp.json()

            charts.forEach((c) => {
                c.nodes.disc.innerText = `${stats[c.name].discovered} of ${stats[c.name].total} discovered`
                buildChart(c.nodes.chart, stats[c.name].counts, stats.userCount)
            })
            updateLeaderboard(leaderboardNode, stats.leaderboard)

            setTimeout(getLatest, 3000)

        } else {
            console.warn('Problem fetching new stats, stopping poll:', await resp.text())
        }
    }

    function updateLeaderboard(node, leaderboard) {
        const users = []
        leaderboard.forEach((user) => {
            users.push(`<li>${user.value} (${user.score})</li>`)
        })
        node.innerHTML = users.join('')
    }

    function buildChart(node, data, maxUsers) {
        node.style['grid-template-rows'] = `repeat(${data.length}, 1fr)`
        const bars = data.map((datum) => {
            const w = Math.floor((Number(datum.value) / maxUsers) * 100)
            return `<div class='bar value-${datum.value}' style='grid-column-end: ${w};'>${datum.value}<span class='label'>${datum.id}</span></div>`
        })
        node.innerHTML = bars.join('')
    }

})()
