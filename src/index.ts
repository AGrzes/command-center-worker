import * as express from 'express'
import jira from './jira'
const app = express()

app.use('/jira', jira)

app.listen(3000)
