import { VertexAI } from '@google-cloud/vertexai';

const projectId = 'health-guide-e7055';

async function testGemini3() {
  // Test 1: us-central1
  console.log('=== Test 1: gemini-3-pro-preview in us-central1 ===');
  try {
    const vertexAI = new VertexAI({
      project: projectId,
      location: 'us-central1',
    });

    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 256,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in 10 words or less.' }] }],
    });

    console.log('✅ SUCCESS with us-central1!');
    console.log('Response:', result.response.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) {
    console.log('❌ ERROR with us-central1:', error.message);
  }

  // Test 2: global
  console.log('\n=== Test 2: gemini-3-pro-preview in global ===');
  try {
    const vertexAI2 = new VertexAI({
      project: projectId,
      location: 'global',
    });

    const model2 = vertexAI2.preview.getGenerativeModel({
      model: 'gemini-3-pro-preview',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 256,
      },
    });

    const result2 = await model2.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in 10 words or less.' }] }],
    });

    console.log('✅ SUCCESS with global!');
    console.log('Response:', result2.response.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error2) {
    console.log('❌ ERROR with global:', error2.message);
  }

  // Test 3: Also test medlm-large
  console.log('\n=== Test 3: medlm-large in us-central1 ===');
  try {
    const vertexAI3 = new VertexAI({
      project: projectId,
      location: 'us-central1',
    });

    const model3 = vertexAI3.preview.getGenerativeModel({
      model: 'medlm-large',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 256,
      },
    });

    const result3 = await model3.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in 10 words or less.' }] }],
    });

    console.log('✅ SUCCESS with medlm-large!');
    console.log('Response:', result3.response.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error3) {
    console.log('❌ ERROR with medlm-large:', error3.message);
  }
}

testGemini3();
