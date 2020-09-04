import { VariableType } from './codegen'

interface IBlock {
  variables: Map<string, any>
  closures: Map<string, any>
}

interface IFuncBlock extends IBlock {
  params: Map<string, any>
}

export class BlockChain {
  public closureCounter: number = 0

  constructor(
    public chain: (IBlock | IFuncBlock)[],
    public currentFuncBlock?: IFuncBlock,
  ) {
    if (this.chain.length === 0) {
      this.closureCounter = 0
    }
  }

  public newBlock(variables?: Map<string, any>): BlockChain {
    const block = { variables: variables || new Map<string, any>(), closures: new Map<string, any>() }
    return new BlockChain([ ...this.chain, block], this.currentFuncBlock)
  }

  public newFuncBlock(params?: Map<string, any>): BlockChain {
    const funcBlock = {
      variables: new Map<string, any>(),
      closures: new Map<string, any>(),
      params: params || new Map<string, any>(),
    }
    return new BlockChain([...this.chain, funcBlock], funcBlock)
  }

  // tslint:disable-next-line: cognitive-complexity
  public accessName(name: string): void {
    let i = this.chain.length
    // if (name === 'i') {
      // console.log(this.chain)
    // }
    if (name.startsWith('@@f')) {
      return
    }
    const currentFuncBlock = this.currentFuncBlock
    let shouldMakeClosure = false
    while (i-- > 0) {
      const block = this.chain[i]
      // console.log('make fucking closure', name, block, i, this.chain.length)
      if (!shouldMakeClosure) {
        if (this.isFuncBlock(block) && block === currentFuncBlock) {
          shouldMakeClosure = true
        }
        continue
      }

      if (i === this.chain.length - 1) {
        if (block.variables.has(name)) {
          return
        }
        if (this.isFuncBlock(block) && block.params.has(name)) {
          return
        }
      }

      const makeClosure = (n: string): void => {
        block.closures.set(n, `@c${this.closureCounter++}`)
      }

      if (block.variables.has(name)) {
        block.variables.set(name, VariableType.CLOSURE)
        makeClosure(name)
        return
      }

      if (this.isFuncBlock(block) && block.params.has(name)) {
        block.params.set(name, VariableType.CLOSURE)
        makeClosure(name)
        return
      }
    }
  }

  public isFuncBlock(block: IFuncBlock | IBlock): block is IFuncBlock {
    return !!(block as IFuncBlock).params
  }

  public newName(name: string, kind: 'var' | 'const' | 'let'): void {
    const block = this.chain.length === 1
      ? this.chain[0]
      : kind === 'var'
        ? this.currentFuncBlock
        : this.chain[this.chain.length - 1]

    block?.variables.set(name, VariableType.VARIABLE)
  }

  public newGlobal(name: string, type: VariableType): void {
    const block = this.chain[0]
    if (!block) {
      throw new Error('Root block is not assigned.')
    }
    block.variables.set(name, type)
  }

  public getNameType(name: string): VariableType {
    let i = this.chain.length
    while (i-- > 0) {
      const block = this.chain[i]
      let varType = block.variables.get(name)
      if (!varType && this.isFuncBlock(block)) {
        varType = block.params.get(name)
      }
      if (varType > 0) {
        return varType
      }
    }
    return VariableType.NO_EXIST
  }

  public hasName(name: string): boolean {
    return this.getNameType(name) > 0
  }

  // tslint:disable-next-line: cognitive-complexity
  public getName(name: string): string {
    let i = this.chain.length
    while (i-- > 0) {
      const block = this.chain[i]
      let varType = block.variables.get(name)
      let isParam = false
      if (!varType && this.isFuncBlock(block)) {
        varType = block.params.get(name)
        isParam = true
      }
      if (!varType) { continue }
      if (varType === VariableType.VARIABLE ) {
        // if (i === this.chain.length - 1) {
        return (isParam ? '.' : '') + name
        // }
        //  else {
        //   throw new Error(`Variable ${name} should be closure but got normal variable type.`)
        // }
      }
      if (varType === VariableType.CLOSURE) {
        if (block.closures.has(name)) {
          return '@' + name
          // return block.closures.get(name)
        } else {
          throw new Error(`Closure for ${name} is not allocated.`)
        }
      }
    }
    return name
  }

  public getCurrentBlock(): IFuncBlock | IBlock {
    return this.chain[this.chain.length - 1]
  }
}
