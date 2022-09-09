"use strict"

window.browser = window.browser || window.chrome

import utils from "./utils.js"

export async function FrontEnd({ name, enable, frontends, redirect, reverse, cookies, localStorage }) {
	let these = {
		enable: enable,
		redirects: {},
		frontend: frontends[0],
		protocol: "normal",
		protocolFallback: true,
		redirectType: "both",
		name: name,
		cookies: cookies ?? [],
		localStorage: localStorage ?? [],
		set enable(val) {
			these.enable = val
			setVar("enable", val)
		},
		set frontend(val) {
			these.frontend = val
			setVar("frontend", val)
		},
		set protocol(val) {
			these.protocol = val
			setVar("protocol", val)
		},
		set protocolFallback(val) {
			these.protocolFallback = val
			setVar("protocolFallback", val)
		},
		set redirectType(val) {
			these.redirectType = val
			setVar("redirectType", val)
		},
		set redirects(val) {
			these.redirects = val
			setVar("redirects", val)
		},
	}

	let setVar = (key, value) => {
		browser.storage.local.get(these.name, r => {
			let frontend = r[these.name]
			frontend[key] = value
			browser.storage.local.set({ [these.name]: frontend })
		})
	}

	these.initDefaults = () => {
		return new Promise(resolve => {
			fetch("/instances/data.json")
				.then(response => response.text())
				.then(list =>
					fetch("/instances/blacklist.json")
						.then(response => response.text())
						.then(blackList => these.setRedirects(JSON.parse(list), JSON.parse(blackList)).then(() => resolve()))
				)
		})
	}

	these.setRedirects = (list, blackList) => {
		return new Promise(resolve => {
			for (const frontend in frontends) {
				these.redirects[frontend] = {}

				these.redirects[frontend].cookies = [...frontends[frontend].cookies]

				for (const protocol in list[frontend]) {
					these.redirects[frontend][protocol] = {}

					these.redirects[frontend][protocol].all = [...list[frontend][protocol]]

					these.redirects[frontend][protocol].custom = []

					these.redirects[frontend][protocol].checked = [...list[frontend][protocol]]
					for (const instance of blackList.cloudflare) {
						const a = these.redirects[frontend][protocol].checked.indexOf(instance)
						if (a > -1) these.redirects[frontend][protocol].checked.splice(a, 1)
					}
					for (const instance of blackList.offline) {
						const a = these.redirects[frontend][protocol].checked.indexOf(instance)
						if (a > -1) these.redirects[frontend][protocol].checked.splice(a, 1)
					}
				}
			}
			browser.storage.local.set(
				{
					[these.name]: {
						[these.redirects]: these.redirects,
						[these.enable]: these.enable,
						[these.frontend]: these.frontend,
						[these.protocol]: these.protocol,
						[these.name]: these.name,
						[these.protocolFallback]: these.protocolFallback,
					},
				},
				() => resolve()
			)
		})
	}

	these.unify = (from, tabId) => {
		return new Promise(async resolve => {
			const protocolHost = utils.protocolHost(from)
			const list = these.redirects[these.frontend][these.protocol]
			if (![...list.checked, ...list.custom].includes(protocolHost)) {
				resolve()
				return
			}
			for (const cookie of these.cookies[these.frontend]) {
				await utils.copyCookie(protocolHost, [...list.checked, list.custom], cookie)
			}

			if (these.localStorage[these.frontend]) {
				await new Promise(resolve => {
					browser.storage.local.set({ tmp_get_list: these.localStorage[these.frontend] }, () => {
						browser.tabs.executeScript(
							tabId,
							{
								file: "/assets/javascripts/localStorage/get.js",
								runAt: "document_start",
							},
							() => {
								for (const to of [...list.checked, list.custom]) {
									browser.tabs.create({ url: to }, tab =>
										browser.tabs.executeScript(
											tab.id,
											{
												file: "/assets/javascripts/localStorage/set.js",
												runAt: "document_start",
											},
											() => {
												resolve()
											}
										)
									)
								}
							}
						)
					})
				})
			}
			resolve(true)
		})
	}

	these.switch = (url, disableOverride) => {
		if (!these.enable && !disableOverride) return

		const protocolHost = utils.protocolHost(url)

		const list = these.redirects[these.frontend][these.protocol]
		if (!list.all.includes(protocolHost)) return

		let userList = [...list.checked, ...list.custom]
		if (userList.length === 0 && these.protocolFallback) userList = [...list.normal.all]

		const i = userList.indexOf(protocolHost)
		if (i > -1) userList.splice(i, 1)
		if (userList.length === 0) return

		const randomInstance = utils.getRandomInstance(userList)
		return `${randomInstance}${url.pathname}${url.search}`
	}

	these.redirect = (url, type, initiator, disableOverride) => {
		if (!these.enable && !disableOverride) return
		if (initiator && these.redirects[these.frontend][these.protocol].all.includes(initiator.origin)) return "BYPASSTAB"
		const result = redirect(url, type, these.frontend, these.redirectType)
		if (result == "SKIP") return "SKIP"
		if (result) {
			const list = these.redirects[these.frontend][these.protocol]
			const userList = [...list.checked, ...list.custom]
			const randomInstance = utils.getRandomInstance(userList)
			const url = new URL(result)
			return `${randomInstance}${url.pathname}${url.search}`
		}
	}

	this.reverse = url => {
		const protocolHost = utils.protocolHost(url)
		const list = these.redirects[these.frontend][these.protocol]
		if (!list.all.includes(protocolHost)) return
		return reverse(url)
	}

	await new Promise(async resolve =>
		browser.storage.local.get(these.name, async r => {
			r = r[these.name]
			if (r) {
				these.redirects = r[these.redirects]
				these.enable = r[these.enable]
				these.frontend = r[these.frontend]
				these.protocol = r[these.protocol]
				these.name = r[these.name]
				these.protocolFallback = r[these.protocolFallback]
			} else {
				await these.initDefaults()
				await init()
			}
			resolve()
		})
	)

	return these
}
