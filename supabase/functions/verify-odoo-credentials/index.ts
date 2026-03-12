async function verifyOdooCredentials(
  odoo_url: string,
  database: string,
  email: string,
  api_key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedUrl = odoo_url.replace(/\/$/, '')
    const url = `${normalizedUrl}/jsonrpc`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'authenticate',
          args: [database, email, api_key, {}],
        },
        id: 1,
      }),
    })

    if (!response.ok) {
      return { success: false, error: `Impossible de se connecter à l'URL Odoo (HTTP ${response.status})` }
    }

    const authData = await response.json()
    if (authData.error) {
      const errorMsg = authData.error.data?.message || authData.error.message || 'Erreur Odoo'
      if (errorMsg.includes('Incorrect password') || errorMsg.includes('AccessError')) {
        return { success: false, error: 'Clé API invalide. Vérifiez votre clé API Odoo.' }
      }
      return { success: false, error: `Erreur: ${errorMsg}` }
    }

    if (!authData.result || typeof authData.result !== 'number') {
      return { success: false, error: "Erreur d'authentification. Vérifiez vos paramètres." }
    }

    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue'
    return { success: false, error: `Erreur: ${errorMsg}` }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const { odoo_url, database, email, api_key } = await req.json()

    if (!odoo_url || !database || !email || !api_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: odoo_url, database, email, api_key' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const result = await verifyOdooCredentials(odoo_url, database, email, api_key)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Request failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
