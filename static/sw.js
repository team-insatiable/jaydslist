self.addEventListener('push', (event) => {
	if (!event.data) return;
	const { title, body, url } = event.data.json();
	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			icon: '/favicon.svg',
			badge: '/favicon.svg',
			data: { url }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
			const match = list.find((c) => c.url === event.notification.data.url);
			if (match) return match.focus();
			return clients.openWindow(event.notification.data.url);
		})
	);
});
