export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const origin = new URL(context.request.url).origin;
  let html = await response.text();

  // Make relative OG image paths absolute (required by link-preview crawlers)
  html = html.replace(/content="\/og-image\.png"/g, `content="${origin}/og-image.png"`);

  return new Response(html, {
    status: response.status,
    headers: response.headers,
  });
};
