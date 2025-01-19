;(() => {

    if (locData) {
        buildChart(document.querySelector('.locationChart'), locData, userCount)
    }
    if (itemData) {
        buildChart(document.querySelector('.itemChart'), itemData, userCount)
    }
    if (npcData) {
        buildChart(document.querySelector('.npcChart'), npcData, userCount)
    }

    // TODO: poll for data


    function buildChart(node, data, maxUsers) {
        node.style['grid-template-rows'] = `repeat(${data.length}, 1fr)`
        const bars = data.map((datum) => {
            const w = Math.floor((Number(datum.value) / maxUsers) * 100)
            return `<div class='bar value-${datum.value}' style='grid-column-end: ${w};'>${datum.value}<span class='label'>${datum.id}</span></div>`
        })
        node.innerHTML = bars.join('')
    }

})()
