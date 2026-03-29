import { TextInputNode }  from './TextInputNode'
import { ImageInputNode } from './ImageInputNode'
import { LLMNode }        from './LLMNode'
import { BranchNode }     from './BranchNode'
import { LoopNode }       from './LoopNode'
import { TextOutputNode } from './TextOutputNode'

// Must be defined at module scope — never inside a component body
export const nodeTypes = {
  textInput:  TextInputNode,
  imageInput: ImageInputNode,
  llm:        LLMNode,
  branch:     BranchNode,
  loop:       LoopNode,
  textOutput: TextOutputNode,
}
