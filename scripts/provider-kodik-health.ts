const configured =
  process.env.KODIK_PROVIDER_ENABLED === "true" &&
  Boolean(process.env.KODIK_API_BASE_URL) &&
  Boolean(process.env.KODIK_API_TOKEN);
console.log(
  JSON.stringify(
    {
      provider: "Kodik",
      status: configured ? "PARTNER_ACCESS_REQUIRED" : "DISABLED",
      reason: configured
        ? "Official contract and permission are not verified"
        : "Provider, API base URL and token must all be configured",
      networkRequests: 0,
      playbackRequests: 0,
      databaseWrites: 0,
    },
    null,
    2,
  ),
);
