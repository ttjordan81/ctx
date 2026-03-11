const { Ctx } = require('../dist');

async function basicExample() {
  console.log('🚀 Starting Ctx basic usage example...\n');

  // Initialize context
  const context = new Ctx();
  
  try {
    // Initialize the context repository
    await context.init();
    console.log('✅ Context initialized\n');

    // Record some AI events
    console.log('📝 Recording events...\n');
    
    const event1 = await context.record({
      event: 'proposal_analysis',
      data: {
        rfp: 'NYSDOH-2026-22',
        score: 0.78,
        requirements_met: 12,
        requirements_total: 15
      },
      agent: 'analyzer-agent',
      model: 'gpt-4',
      confidence: 0.84
    });
    console.log(`Recorded: ${event1.id}`);

    const event2 = await context.record({
      event: 'user_query',
      data: {
        query: 'show me high-scoring proposals',
        intent: 'data_request',
        user_id: 'user_123'
      },
      session: 'session_abc'
    });
    console.log(`Recorded: ${event2.id}`);

    const event3 = await context.record({
      event: 'recommendation_generated',
      data: {
        recommendations: ['proposal_A', 'proposal_B'],
        reasoning: 'Both meet technical requirements and budget constraints'
      },
      agent: 'recommendation-agent',
      confidence: 0.91
    });
    console.log(`Recorded: ${event3.id}\n`);

    // Query events
    console.log('🔍 Querying events...\n');
    
    const allEvents = await context.last(undefined, 10);
    console.log(`Found ${allEvents.length} recent events:\n`);
    allEvents.forEach(event => {
      console.log(`- ${event.timestamp}: ${event.type}`);
      if (event.agent) console.log(`  Agent: ${event.agent}`);
      if (event.confidence) console.log(`  Confidence: ${event.confidence}`);
      console.log('');
    });

    // Query by agent
    console.log('🤖 Events by analyzer-agent:\n');
    const agentEvents = await context.byAgent('analyzer-agent');
    agentEvents.forEach(event => {
      console.log(`- ${event.type}: ${JSON.stringify(event.data)}`);
    });

    // Query by type
    console.log('\n📊 Proposal analysis events:\n');
    const proposalEvents = await context.last('proposal_analysis', 5);
    proposalEvents.forEach(event => {
      console.log(`- Score: ${event.data.score}, RFP: ${event.data.rfp}`);
    });

    console.log('\n✅ Example completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await context.close();
  }
}

// Run the example
basicExample();
