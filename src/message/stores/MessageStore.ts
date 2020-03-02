import { observable } from "mobx"
import { decodeMessage } from "../../core/helpers/decodeMessage"
import { InitialisableStore } from "../../state/classes/InitialisableStore"
import { Message } from "../classes/Message"
import { INITIAL_MESSAGE_DATA } from "../constants"

export class MessageStore extends InitialisableStore {
  @observable message!: Message

  initialise() {
    const { ssrStore } = this.manager.stores

    const search = ssrStore.context ? ssrStore.context.search : location.search
    const parameters = new URLSearchParams(search)
    const encodedBackup = parameters.get("message") ?? parameters.get("backup")

    const messageData = decodeMessage(encodedBackup ?? "")
    if (!SERVER && messageData) console.log("Loaded with message:", messageData)

    this.message = new Message(messageData ?? INITIAL_MESSAGE_DATA)
  }
}
