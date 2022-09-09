window.browser = window.browser || window.chrome

browser.storage.local.get("tmp_set_list", r => {
	for (const key in r.tmp_set_list) {
		localStorage.setItem(key, r.tmp_set_list[key])
	}
	browser.storage.local.remove("tmp_set_list", () => {
		window.close()
	})
})
