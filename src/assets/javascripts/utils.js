window.browser = window.browser || window.chrome
import Twitter from "./twitter.js"
import Youtube from "./youtube.js"
import Instagram from "./instagram.js"
import Medium from "./medium.js"
import Reddit from "./reddit.js"
import Search from "./search.js"
import Translate from "./translate.js"
import Wikipedia from "./wikipedia.js"
import Peertube from "./peertube.js"
import Lbry from "./lbry.js"
import SendTargets from "./sendTargets.js"
import Tiktok from "./tiktok.js"
import Quora from "./quora.js"
import Imdb from "./imdb.js"
import Imgur from "./imgur.js"
import Reuters from "./reuters.js"
import YoutubeMusic from "./youtubeMusic.js"
import Maps from "./maps.js"
import localise from "./localise.js"

function getRandomInstance(instances) {
	return instances[~~(instances.length * Math.random())]
}

let cloudflareBlackList = []
let authenticateBlackList = []
let offlineBlackList = []
async function initBlackList() {
	return new Promise(resolve => {
		browser.storage.local.get(["cloudflareBlackList", "authenticateBlackList", "offlineBlackList"], r => {
			cloudflareBlackList = r.cloudflareBlackList
			authenticateBlackList = r.authenticateBlackList
			offlineBlackList = r.offlineBlackList
		})
		if (cloudflareBlackList.length == 0) {
			fetch("/instances/blacklist.json")
				.then(response => response.text())
				.then(data => {
					cloudflareBlackList = JSON.parse(data).cloudflare
					authenticateBlackList = JSON.parse(data).authenticate
					offlineBlackList = JSON.parse(data).offline
				})
		}
		resolve()
	})
}

function updateBlackList() {
	return new Promise(async resolve => {
		let http = new XMLHttpRequest()
		let fallback = new XMLHttpRequest()
		http.open("GET", "https://codeberg.org/LibRedirect/libredirect/raw/branch/master/src/instances/blacklist.json", false)
		http.send(null)
		if (http.status != 200) {
			fallback.open("GET", "https://raw.githubusercontent.com/libredirect/libredirect/master/src/instances/blacklist.json", false)
			fallback.send(null)
			if (fallback.status === 200) {
				http = fallback
			} else {
				resolve()
				return
			}
		}
		const blackList = JSON.parse(http.responseText)
		browser.storage.local.set({
			cloudflareBlackList: blackList.cloudflare,
			authenticateBlackList: blackList.authenticate,
			offlineBlackList: blackList.offline,
		})
		resolve(blackList)
	})
}

function updateInstances() {
	return new Promise(async resolve => {
		let http = new XMLHttpRequest()
		let fallback = new XMLHttpRequest()
		http.open("GET", "https://raw.githubusercontent.com/libredirect/libredirect/master/src/instances/data.json", false)
		http.send(null)
		if (http.status != 200) {
			fallback.open("GET", "https://codeberg.org/LibRedirect/libredirect/raw/branch/master/src/instances/data.json", false)
			fallback.send(null)
			if (fallback.status === 200) {
				http = fallback
			} else {
				resolve()
				return
			}
		}
		const blackList = await updateBlackList()
		const list = JSON.parse(http.responseText)

		await youtubeHelper.setRedirects(list, blackList)

		await twitterHelper.setRedirects(instances.nitter)
		await instagramHelper.setRedirects(instances.bibliogram)
		await Reddit.setRedirects({
			list: instances,
			blackList: blackList,
		})
		await translateHelper.setRedirects({
			simplyTranslate: instances.simplyTranslate,
			lingva: instances.lingva,
		})
		await searchHelper.setRedirects({
			searx: instances.searx,
			searxng: instances.searxng,
			whoogle: instances.whoogle,
			librex: instances.librex,
		})
		await wikipediaHelper.setRedirects(instances.wikiless)
		await mediumHelper.setRedirects(instances.scribe)
		await quoraHelper.setRedirects(instances.quetre)
		await libremdbHelper.setRedirects(instances.libremdb)
		await sendTargetsHelper.setRedirects(instances.send)
		await tiktokHelper.setRedirects(instances.proxiTok)
		await lbryHelper.setRedirects(instances.librarian)
		await reutersHelper.setRedirects(instances.neuters)
		await youtubeMusicHelper.setRedirects({
			beatbump: instances.beatbump,
			hyperpipe: instances.hyperpipe,
		})
		await mapsHelper.setRedirects(instances.facil)
		await peertubeHelper.setRedirects(instances.simpleertube)

		console.info("Successfully updated Instances")
		resolve(true)
		return
	})
}

function protocolHost(url) {
	if (url.username && url.password) return `${url.protocol}//${url.username}:${url.password}@${url.host}`
	return `${url.protocol}//${url.host}`
}

async function processDefaultCustomInstances(target, name, protocol, document) {
	function camelCase(str) {
		return str.charAt(0).toUpperCase() + str.slice(1)
	}
	let latencyKey = `${name}Latency`
	let instancesLatency
	let nameProtocolElement = document.getElementById(name).getElementsByClassName(protocol)[0]

	let nameCustomInstances = []
	let nameCheckListElement = nameProtocolElement.getElementsByClassName("checklist")[0]

	await initBlackList()

	let nameDefaultRedirects

	let redirectsChecks = `${name}${camelCase(protocol)}RedirectsChecks`
	let customRedirects = `${name}${camelCase(protocol)}CustomRedirects`
	let redirectsKey = `${target}Redirects`

	let redirects

	async function getFromStorage() {
		return new Promise(async resolve =>
			browser.storage.local.get([redirectsChecks, customRedirects, redirectsKey, latencyKey], r => {
				nameDefaultRedirects = r[redirectsChecks]
				nameCustomInstances = r[customRedirects]
				instancesLatency = r[latencyKey] ?? []
				redirects = r[redirectsKey]
				resolve()
			})
		)
	}

	await getFromStorage()
	if (nameCustomInstances === undefined) console.log(customRedirects)

	function calcNameCheckBoxes() {
		let isTrue = true
		for (const item of redirects[name][protocol]) {
			if (nameDefaultRedirects === undefined) console.log(name + protocol + " is undefined")
			if (!nameDefaultRedirects.includes(item)) {
				isTrue = false
				break
			}
		}
		for (const element of nameCheckListElement.getElementsByTagName("input")) {
			element.checked = nameDefaultRedirects.includes(element.className)
		}
		if (nameDefaultRedirects.length == 0) isTrue = false
		nameProtocolElement.getElementsByClassName("toggle-all")[0].checked = isTrue
	}
	nameCheckListElement.innerHTML = [
		`<div>
        <x data-localise="__MSG_toggleAll__">Toggle All</x>
        <input type="checkbox" class="toggle-all"/>
      </div>`,
		...redirects[name][protocol].map(x => {
			const cloudflare = cloudflareBlackList.includes(x) ? ' <span style="color:red;">cloudflare</span>' : ""
			const authenticate = authenticateBlackList.includes(x) ? ' <span style="color:orange;">authenticate</span>' : ""
			const offline = offlineBlackList.includes(x) ? ' <span style="color:grey;">offline</span>' : ""

			let ms = instancesLatency[x]
			let latencyColor = ms <= 1000 ? "green" : ms <= 2000 ? "orange" : "red"
			let latencyLimit
			if (ms == 5000) latencyLimit = "5000ms+"
			else if (ms > 5000) latencyLimit = `ERROR: ${ms - 5000}`
			else latencyLimit = ms + "ms"

			const latency = x in instancesLatency ? '<span style="color:' + latencyColor + ';">' + latencyLimit + "</span>" : ""

			let warnings = [cloudflare, authenticate, offline, latency].join(" ")
			return `<div>
                    <x><a href="${x}" target="_blank">${x}</a>${warnings}</x>
                    <input type="checkbox" class="${x}"/>
                  </div>`
		}),
	].join("\n<hr>\n")

	localise.localisePage()

	calcNameCheckBoxes()
	nameProtocolElement.getElementsByClassName("toggle-all")[0].addEventListener("change", async event => {
		if (event.target.checked) nameDefaultRedirects = [...redirects[name][protocol]]
		else nameDefaultRedirects = []

		browser.storage.local.set({ [redirectsChecks]: nameDefaultRedirects })
		calcNameCheckBoxes()
	})

	for (let element of nameCheckListElement.getElementsByTagName("input")) {
		if (element.className != "toggle-all")
			nameProtocolElement.getElementsByClassName(element.className)[0].addEventListener("change", async event => {
				if (event.target.checked) nameDefaultRedirects.push(element.className)
				else {
					let index = nameDefaultRedirects.indexOf(element.className)
					if (index > -1) nameDefaultRedirects.splice(index, 1)
				}
				browser.storage.local.set({
					[redirectsChecks]: nameDefaultRedirects,
				})
				calcNameCheckBoxes()
			})
	}

	function calcNameCustomInstances() {
		nameProtocolElement.getElementsByClassName("custom-checklist")[0].innerHTML = nameCustomInstances
			.map(
				x => `<div>
                ${x}
                <button class="add clear-${x}">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                  </svg>
                </button>
              </div>
              <hr>`
			)
			.join("\n")

		for (const item of nameCustomInstances) {
			nameProtocolElement.getElementsByClassName(`clear-${item}`)[0].addEventListener("click", async () => {
				let index = nameCustomInstances.indexOf(item)
				if (index > -1) nameCustomInstances.splice(index, 1)
				browser.storage.local.set({ [customRedirects]: nameCustomInstances })
				calcNameCustomInstances()
			})
		}
	}
	calcNameCustomInstances()
	nameProtocolElement.getElementsByClassName("custom-instance-form")[0].addEventListener("submit", async event => {
		event.preventDefault()
		let nameCustomInstanceInput = nameProtocolElement.getElementsByClassName("custom-instance")[0]
		let url = new URL(nameCustomInstanceInput.value)
		let protocolHostVar = protocolHost(url)
		if (nameCustomInstanceInput.validity.valid && !redirects[name][protocol].includes(protocolHostVar)) {
			if (!nameCustomInstances.includes(protocolHostVar)) {
				nameCustomInstances.push(protocolHostVar)
				browser.storage.local.set({ [customRedirects]: nameCustomInstances })
				nameCustomInstanceInput.value = ""
			}
			calcNameCustomInstances()
		}
	})
}

function ping(href) {
	return new Promise(async resolve => {
		let average = 0
		let time
		for (let i = 0; i < 3; i++) {
			time = await pingOnce(href)
			if (i == 0) continue
			if (time >= 5000) {
				resolve(time)
				return
			}
			average += time
		}
		average = parseInt(average / 3)
		resolve(average)
	})
}

function pingOnce(href) {
	return new Promise(async resolve => {
		let started
		let http = new XMLHttpRequest()
		http.timeout = 5000
		http.ontimeout = () => resolve(5000)
		http.onerror = () => resolve()
		http.onreadystatechange = () => {
			if (http.readyState == 2) {
				if (http.status == 200) {
					let ended = new Date().getTime()
					http.abort()
					resolve(ended - started)
				} else {
					resolve(5000 + http.status)
				}
			}
		}
		http.open("GET", `${href}?_=${new Date().getTime()}`, true)
		started = new Date().getTime()
		http.send(null)
	})
}

async function testLatency(element, instances, frontend) {
	return new Promise(async resolve => {
		let myList = {}
		let latencyThreshold
		let redirectsChecks = []
		browser.storage.local.get(["latencyThreshold", `${frontend}NormalRedirectsChecks`], r => {
			latencyThreshold = r.latencyThreshold
			redirectsChecks = r[`${frontend}NormalRedirectsChecks`]
		})
		for (const href of instances)
			await ping(href).then(time => {
				if (time) {
					myList[href] = time
					let color
					if (time <= 1000) color = "green"
					else if (time <= 2000) color = "orange"
					else color = "red"

					if (time > latencyThreshold) {
						redirectsChecks.splice(redirectsChecks.indexOf(href), 1)
					}

					browser.storage.local.set({ [`${frontend}NormalRedirectsChecks`]: redirectsChecks })

					let text
					if (time == 5000) text = "5000ms+"
					else if (time > 5000) text = `ERROR: ${time - 5000}`
					else text = `${time}ms`
					element.innerHTML = `${href}:&nbsp;<span style="color:${color};">${text}</span>`
				}
			})
		resolve(myList)
	})
}

function copyCookie(targetUrl, urls, name) {
	return new Promise(resolve => {
		browser.cookies.getAll(
			{
				url: protocolHost(targetUrl),
				name: name,
			},
			async cookies => {
				for (const cookie of cookies) {
					if (cookie.name == name) {
						for (const url of urls) {
							browser.cookies.set({
								url: url,
								name: name,
								value: cookie.value,
								secure: true,
								expirationDate: cookie.expirationDate,
							})
						}
						break
					}
				}
				resolve()
			}
		)
	})
}

function copyRaw(test, copyRawElement) {
	return new Promise(resolve => {
		browser.tabs.query({ active: true, currentWindow: true }, async tabs => {
			let currTab = tabs[0]
			if (currTab) {
				let url
				try {
					url = new URL(currTab.url)
				} catch {
					resolve()
					return
				}

				let newUrl
				for (const frontend of [Youtube, Twitter, Instagram, Tiktok, Quora, Imdb, Imgur]) {
					if (!newUrl) newUrl = await frontend.reverse(url)
				}

				if (newUrl) {
					resolve(newUrl)
					if (test) return
					navigator.clipboard.writeText(newUrl)
					if (copyRawElement) {
						const textElement = copyRawElement.getElementsByTagName("h4")[0]
						const oldHtml = textElement.innerHTML
						textElement.innerHTML = browser.i18n.getMessage("copied")
						setTimeout(() => (textElement.innerHTML = oldHtml), 1000)
					}
				}
			}
			resolve()
		})
	})
}

function unify(test) {
	return new Promise(resolve => {
		browser.tabs.query({ active: true, currentWindow: true }, async tabs => {
			let currTab = tabs[0]
			if (currTab) {
				let url
				try {
					url = new URL(currTab.url)
				} catch {
					resolve()
					return
				}

				let result
				for (const frontend of [Youtube, Twitter, Reddit, Search, Tiktok, Wikipedia, Translate, Instagram]) {
					if (!result) result = await frontend.unify(url, currTab.id, test)
				}

				resolve(result)
			}
		})
	})
}

function switchInstance(test) {
	return new Promise(resolve => {
		browser.tabs.query({ active: true, currentWindow: true }, async tabs => {
			let currTab = tabs[0]
			if (currTab) {
				let url
				try {
					url = new URL(currTab.url)
				} catch {
					resolve()
					return
				}

				let newUrl
				for (const frontend of [Youtube, YoutubeMusic, Twitter, Instagram, Reddit, Search, Translate, Maps, Wikipedia, Medium, Quora, Imdb, Reuters, Imgur, Tiktok, SendTargets, Peertube, Lbry]) {
					if (!newUrl) newUrl = frontend.switch(url, true)
				}

				if (newUrl) {
					if (!test) browser.tabs.update({ url: newUrl })
					resolve(true)
				} else {
					resolve()
				}
			}
		})
	})
}

function latency(name, frontend, document, location) {
	let latencyElement = document.getElementById(`latency-${frontend}`)
	let latencyLabel = document.getElementById(`latency-${frontend}-label`)
	latencyElement.addEventListener("click", async () => {
		let reloadWindow = () => location.reload()
		latencyElement.addEventListener("click", reloadWindow)
		let key = `${name}Redirects`
		browser.storage.local.get(key, r => {
			let redirects = r[key]
			const oldHtml = latencyLabel.innerHTML
			latencyLabel.innerHTML = "..."
			testLatency(latencyLabel, redirects[frontend].normal, frontend).then(r => {
				browser.storage.local.set({ [`${frontend}Latency`]: r })
				latencyLabel.innerHTML = oldHtml
				processDefaultCustomInstances(name, frontend, "normal", document)
				latencyElement.removeEventListener("click", reloadWindow)
			})
		})
	})
}

export default {
	getRandomInstance,
	updateInstances,
	protocolHost,
	processDefaultCustomInstances,
	latency,
	copyCookie,
	switchInstance,
	copyRaw,
	unify,
}
