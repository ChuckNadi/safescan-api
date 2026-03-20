export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image}` }
            },
            {
              type: "text",
              text: `Look at this image and find ANY barcode numbers.

CRITICAL: 
- Look for UPC, EAN, or any barcode in the image
- The number is usually printed BELOW the barcode lines
- It's typically 8-14 digits
- Look in corners, edges, anywhere on the package
- Also look for the product name/brand

Return ONLY valid JSON (no markdown):
{
  "barcode": "the barcode number or null",
  "confidence": "high|medium|low|none",
  "barcode_type": "UPC-A|EAN-13|UPC-E|unknown|null",
  "product_name": "product name if visible or null"
}

If no barcode found, return:
{"barcode": null, "confidence": "none", "barcode_type": null, "product_name": null}`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      const cleanJson = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.status(200).json({
        success: true,
        barcode: parsed.barcode,
        confidence: parsed.confidence,
        barcode_type: parsed.barcode_type,
        product_name: parsed.product_name
      });
    }

    return res.status(200).json({ success: false, error: 'No barcode found' });

  } catch (error) {
    console.error('Barcode extraction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
