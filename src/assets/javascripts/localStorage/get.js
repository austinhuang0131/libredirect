window.browser = window.browser || window.chrome

browser.storage.local.get("tmp_get_list", r => {
	let tmp_set_list = {}
	for (const item of r.tmp_get_list) {
		tmp_set_list[item] = localStorage.getItem(item)
	}
	browser.storage.local.remove("tmp_get_list", () => {
		browser.storage.local.set(tmp_set_list, () => {
			window.close()
		})
	})
})
