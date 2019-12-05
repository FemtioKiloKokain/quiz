import React from 'react'
import {StateLink, withRouterHOC, IntentLink} from 'part:@sanity/base/router'
import client from 'part:@sanity/base/client'
import Button from 'part:@sanity/components/buttons/default'
import {get} from 'lodash'
import BeforeMatch from './pregame/BeforeMatch'
import AfterMatch from './AfterMatch'
import Question from './quiz/Question'
import QuestionScores from './results/QuestionScores'
import Results from './results/Results'
import globals from './styles/globals.css'
import IntentButton from 'part:@sanity/components/buttons/intent'

import styles from './styles/Match.css'

function nextQuestion(match) {
  const {currentQuestionKey, quiz} = match
  const {questions} = quiz
  const index = questions.map(question => question._key).indexOf(currentQuestionKey)
  return questions[index + 1]
}


class Match extends React.Component {
  handleStartMatch = () => {
    console.log('start match button clicked')
    const {match} = this.props
    const firstQuestionKey = match.quiz.questions[0]._key
    client
      .patch(match._id)
      .set({
        startedAt: new Date().toISOString(),
        currentQuestionKey: firstQuestionKey,
        isCurrentQuestionOpen: true
      })
      .commit()
  }

  handleNextQuestion = () => {
    console.log('next question button clicked')
    const {match} = this.props

    const next = nextQuestion(match)
    if (next) {
      client
        .patch(match._id)
        .set({currentQuestionKey: next._key, isCurrentQuestionOpen: true})
        .commit()
    }
  }

  handleFinishMatch = () => {
    console.log('finish match button clicked')
    const {match} = this.props

    client
      .patch(match._id)
      .set({
        finishedAt: new Date().toISOString(),
        isCurrentQuestionOpen: false
      })
      .unset(['currentQuestionKey'])
      .commit()
  }

  handleCancelMatch = () => {
    console.log('cancel match button clicked')
    const {match} = this.props
    client
      .patch(match._id)
      .set({isCurrentQuestionOpen: false})
      .unset(['startedAt', 'currentQuestionKey'])
      .commit()
  }

  handleCloseQuestion = () => {
    console.log('closing current question')
    const {match} = this.props
    client
      .patch(match._id)
      .set({isCurrentQuestionOpen: false})
      .commit()
  }

  handleKickPlayer = playerId => {
    console.log('kick player button clicked')
    const {match} = this.props

    client
      .patch(match._id)
      .unset([`players[_ref=="${playerId}"]`])
      .commit()
  }

  render() {
    const {match} = this.props
    const {selectedDocumentId} = this.props.router.state

    if (!match) {
      return <div>No match for {selectedDocumentId}</div>
    }

    const {startedAt, finishedAt, quiz, isCurrentQuestionOpen, currentQuestionKey} = match
    const isOngoing = startedAt && !finishedAt
    const isNotYetStarted = !startedAt && !finishedAt
    const isFinished = startedAt && finishedAt
    const isCurrentQuestionTheLast =
      quiz.questions.map(question => question._key).indexOf(currentQuestionKey) ===
      quiz.questions.length - 1
    const isFinalQuestionCompleted = isCurrentQuestionTheLast && !isCurrentQuestionOpen

    const hasPlayers = match.players.length !== 0
    const hasQuestions = quiz.questions && get(quiz, 'questions', []).length > 0

    if (!quiz) {
      return (
        <div>
          The Match must be based on a Quiz. Go back and add one
          <IntentLink intent="edit" params={{id: match._id}}>
            Create
          </IntentLink>
        </div>
      )
    }

    return (
      <div className={styles.root}>
        {isNotYetStarted && (
          <BeforeMatch
            match={match}
            onStart={this.handleStartMatch}
            onKickPlayer={this.handleKickPlayer}
          />
        )}

        {isOngoing && (
          <>
            {!isFinalQuestionCompleted && 
              <Button onClick={this.handleCancelMatch} color="primary" className={styles.stopButton}>
                Stop game
              </Button>
            }

            {isCurrentQuestionOpen && (
              <Question match={match} onCloseQuestion={this.handleCloseQuestion} />
            )}

            {!isCurrentQuestionOpen && (
              <Results match={match}/>
            )}
          </>
        )}

        {isFinished && <AfterMatch match={match} />}

        <div className={styles.buttonsWrapper}>
          {isOngoing && !isFinalQuestionCompleted && !isCurrentQuestionOpen && 
            <Button onClick={this.handleNextQuestion} color="primary" className={styles.button}>
                Next question
            </Button>
            }
            {!isOngoing && hasPlayers &&
              <Button onClick={this.handleStartMatch} disabled={!hasQuestions} color="primary" className={styles.button}>
                Start game
              </Button>
            }
            {
              isFinalQuestionCompleted &&
              <IntentButton
                color="primary"
                intent="create"
                params={{type: 'match'}}
                onClick={()=>{}}
                title="Create new match"
                className={styles.button}
              >Create new game</IntentButton>
            }
        </div>
      </div>
    )
  }
}

export default withRouterHOC(Match)
