import { agentsDeck, frontendDeck } from './presentation-architecture';
import { evaluationDeck } from './presentation-evaluation';
import { contextDeck } from './presentation-context';
import { inputDeck } from './presentation-input';
export { agentsDeck, frontendDeck, evaluationDeck, contextDeck, inputDeck };
export function detailPresentation(index:string,pageClassName?:string){
  return pageClassName==='detail-page--vertical-lab'?evaluationDeck
    :pageClassName==='detail-page--frontend-evolution'?frontendDeck
    :index.startsWith('05')?inputDeck
    :index.startsWith('04')?contextDeck:agentsDeck;
}
