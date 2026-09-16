import { Component, type ErrorInfo, type ReactNode } from 'react'
import s from './app.module.css'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Última linha de defesa (§7.2): erro de render vira uma tela com "Recarregar", não tela branca. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <main className={s.home}>
        <h1>Algo deu errado</h1>
        <p className={s.error}>{this.state.error.message}</p>
        <button type="button" className={s.cta} onClick={() => location.reload()}>
          Recarregar
        </button>
      </main>
    )
  }
}
