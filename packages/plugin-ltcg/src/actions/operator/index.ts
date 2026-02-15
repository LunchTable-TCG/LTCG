/**
 * Operator Actions Index
 *
 * Actions for game operators to manage their white-label TCG deployment.
 */

import { seedCardsAction } from "./seedCardsAction";
import { updateConfigAction } from "./updateConfigAction";

export const operatorActions = [updateConfigAction, seedCardsAction];

export { seedCardsAction, updateConfigAction };
