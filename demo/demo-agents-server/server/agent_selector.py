from ..agents.test_agent import TestAgent

AGENT_INSTANCES = {}

def init_agents():
    AGENT_INSTANCES.clear()
    AGENT_INSTANCES["testagent"] = TestAgent(agent_id="testagent")

def get_agent_stream(agent_id: str):
    agent_instance = AGENT_INSTANCES.get(agent_id)
    if not agent_instance:
        raise ValueError(f"Agent with id {agent_id} not found")

    return agent_instance.run
