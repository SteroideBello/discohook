import React, { useRef } from "react"
import styled from "styled-components"
import { FlexContainer } from "../../editor/components/Container"
import { MAX_FILE_SIZE } from "../constants"
import { Button } from "./Button"
import { InputContainer } from "./InputContainer"
import { InputLabel } from "./InputLabel"
import { InputNote } from "./InputNote"
import { TextInput } from "./TextInput"

const FileInputContainer = styled.div`
  position: relative;
  margin: 0 8px 0 0;
`

const FakeInput = styled(TextInput.withComponent("div"))`
  position: absolute;

  height: 32px;
  width: 100%;

  ${FileInputContainer}:focus-within > & {
    box-shadow: ${({ theme }) => theme.elavation.low};
  }
`

const HiddenInput = styled.input.attrs({ type: "file", multiple: true })`
  position: absolute;
  top: 8px;

  height: 32px;
  width: 100%;

  opacity: 0;
`

const RemoveFilesButton = styled(Button)`
  margin-right: 0;
`

export type FileInputProps = {
  files: readonly File[]
  onChange: (files: readonly File[]) => void
}

export function FileInput(props: FileInputProps) {
  const { files, onChange: handleChange } = props

  const inputRef = useRef<HTMLInputElement>(null)

  const handleRemoveFiles = () => {
    if (!inputRef.current) return

    inputRef.current.value = ""
    handleChange([])
  }

  const errors: string[] = []
  if (
    files.length > 0 &&
    (SERVER || !files.some(file => file instanceof File))
  ) {
    errors.push("files are unavailable")
  }
  const totalFileSize = files.reduce((total, file) => total + file.size, 0)
  if (totalFileSize > MAX_FILE_SIZE) {
    errors.push("files exceed maximum file size")
  }

  return (
    <InputContainer>
      <FlexContainer flow="row">
        <InputLabel htmlFor="file">Files</InputLabel>
        {errors.length > 0 && (
          <InputNote state="error">
            {errors.join(", ").replace(/^\w/, letter => letter.toUpperCase())}
          </InputNote>
        )}
      </FlexContainer>
      <FlexContainer flow="row">
        <FileInputContainer>
          <FakeInput>{files.map(file => file.name).join(", ")}</FakeInput>
          <HiddenInput
            id="file"
            onChange={event => handleChange([...event.target.files])}
            ref={inputRef}
          />
        </FileInputContainer>
        <RemoveFilesButton onClick={handleRemoveFiles}>
          Remove files
        </RemoveFilesButton>
      </FlexContainer>
    </InputContainer>
  )
}
