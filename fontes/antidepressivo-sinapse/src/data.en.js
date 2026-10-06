// English texts, by id. Everything that is not text (ids, colours, relations, step timing) lives in data.pt.js.
export const T = {
  groups: {
    pre: 'Presynaptic terminal',
    fenda: 'Cleft',
    pos: 'Postsynaptic neuron',
    fim: 'End of the signal',
    farm: 'Drug',
  },

  views: {
    syn: 'Synapse',
    cleft: 'Cleft',
    sert: 'Transporter',
  },

  path: {},

  steps: {
    chegada: {
      title: 'The action potential arrives',
      text: 'The action potential travels down the axon and depolarizes the terminal. The voltage-gated Ca²⁺ channels open, and Ca²⁺ enters.',
    },
    liberacao: {
      title: 'Serotonin is released into the cleft',
      text: 'Ca²⁺ makes the docked vesicles fuse with the membrane: this is exocytosis. Serotonin spills into the cleft and spreads.',
    },
    receptor: {
      title: 'The receptor activates the G-protein',
      text: 'Serotonin binds to the receptors of the next neuron. Each occupied receptor activates G-proteins, which act on channels and enzymes. It is a slow pathway that amplifies and lasts.',
    },
    recaptacao: {
      title: 'Reuptake clears the cleft',
      text: 'The transporter carries serotonin back into the terminal, with two Na⁺ per molecule. The cleft empties, the receptors let go and the signal ends.',
    },
    destino: {
      title: 'Back in the terminal',
      text: 'Serotonin that has been taken back up has two fates: it is reloaded into a vesicle or destroyed by MAO, on the surface of the mitochondria.',
    },
    isrs: {
      title: 'The SSRI comes in',
      text: 'The drug binds to the serotonin transporter. With the transporter occupied, reuptake is blocked.',
    },
    efeito: {
      title: 'The same firing, with the SSRI',
      text: 'In the model, the action potential releases the same amount of serotonin. But it takes longer to leave the cleft, and the receptors stay occupied for longer. Compare the two curves on the graph.',
    },
    limites: {
      title: 'What the model does not show',
      text: 'Extra, from outside chapters 1 to 6: the transporter is blocked within hours, but the improvement in mood usually takes weeks. More serotonin in the cleft is only the first step.',
    },
  },

  items: {
    terminal: {
      name: 'Serotonergic terminal',
      aka: 'Presynaptic axon terminal',
      morf: 'Tip of the axon of a neuron that uses serotonin. Inside it has vesicles, mitochondria and the enzymes that make the transmitter.',
      func: 'Makes, stores and releases serotonin. Then it takes it back up from the cleft, through the transporters in its own membrane.',
      clueTitle: 'Why it matters',
      clue: 'Only the small transmitter is assembled in the terminal. The enzymes come from the soma, because the axon does not make proteins.',
      more: [
        'The neurons that use serotonin are few, but they play a role in mood, emotional behavior and sleep.',
        { x: 'The cell bodies of these neurons are in the raphe nuclei, in the brain stem, and their axons spread through much of the brain. That is a subject of chapter 15.' },
      ],
      where: 'The blue bulb at the top, cut open, and the axon that reaches it.',
    },
    vesicula: {
      name: 'Synaptic vesicle',
      rows: [['Size', 'about 50 nm']],
      morf: 'Sphere of membrane filled with neurotransmitter.',
      func: 'Stores serotonin and releases it into the cleft by exocytosis, when Ca²⁺ enters the terminal.',
      clueTitle: 'How it fills up',
      clue: 'A transporter in the vesicle membrane swaps one H⁺ going out for one transmitter molecule coming in. An ATP-driven H⁺ pump keeps the vesicle acidic.',
      more: [
        'This transporter concentrates the transmitter up to 100,000 times.',
        'The vesicles docked at the active zone are released first. After exocytosis, the membrane is recovered by endocytosis and the vesicle is refilled.',
        'SNARE proteins hold the vesicle to the membrane, and synaptotagmin is the Ca²⁺ sensor that triggers fusion.',
      ],
      where: 'The pale yellow spheres inside the terminal. The ones at the bottom are docked at the active zones.',
    },
    'zona-ativa': {
      name: 'Active zone',
      morf: 'Patch of the presynaptic membrane where the vesicles are docked, facing the cleft.',
      func: 'It is the site of release. The Ca²⁺ channels sit right next to the docked vesicles, which is why exocytosis is so fast.',
      where: 'The dark bars on the floor of the terminal.',
    },
    'canal-ca': {
      name: 'Voltage-gated Ca²⁺ channel',
      morf: 'Protein in the membrane of the terminal, a relative of the Na⁺ channels of the action potential, but one that lets Ca²⁺ through.',
      func: 'Opens when the action potential depolarizes the terminal. The Ca²⁺ that enters is the signal to release the transmitter.',
      where: 'The lilac rings on the floor of the terminal, between the active zones.',
    },
    calcio: {
      name: 'Calcium (Ca²⁺)',
      rows: [['Outside', '2 mM'], ['Inside', '0.0002 mM']],
      morf: 'Ion ten thousand times more concentrated outside the neuron.',
      func: 'Enters through the open channels and makes the docked vesicles fuse with the membrane.',
      more: ['Near the active zone, the concentration rises above 0.01 mM when the channels open.'],
      where: 'The lilac dots that enter the terminal when the action potential arrives.',
    },
    mitocondria: {
      name: 'Mitochondrion',
      rows: [['Size', 'about 1 µm']],
      morf: 'Elongated organelle, with a folded inner membrane.',
      func: 'Makes the ATP of the terminal. Its outer membrane carries MAO.',
      more: ['The axon terminal has many mitochondria: a sign of high energy use.'],
      where: 'The two reddish organelles inside the terminal.',
    },

    serotonina: {
      name: 'Serotonin',
      aka: '5-HT',
      rows: [['Family', 'Amine'], ['Made from', 'Tryptophan']],
      morf: 'Small molecule, of the amine family. It is made in the cytosol of the terminal, from the amino acid tryptophan.',
      func: 'It is the neurotransmitter of this synapse. Released into the cleft, it binds to the receptors of the next neuron.',
      clueTitle: 'The synthesis route',
      clue: 'Tryptophan → 5-HTP → serotonin. What limits production is the tryptophan available, which comes from the blood and, before that, from the diet.',
      more: [
        'Its action ends by reuptake: a specific transporter carries it back into the terminal.',
        'Inside the terminal, it goes back into a vesicle or is destroyed by MAO.',
      ],
      where: 'The bright yellow spheres, loose in the cleft after the firing. Before that, they are stored inside the vesicles.',
    },
    fenda: {
      name: 'Synaptic cleft',
      rows: [['Width', '20 to 50 nm']],
      morf: 'Space between the presynaptic membrane and the postsynaptic membrane.',
      func: 'It is what the transmitter crosses. While the transmitter is there, the receptors keep being activated.',
      clueTitle: 'Three ways to clear the cleft',
      clue: 'Diffusion away, reuptake by transporters and breakdown by enzymes. At this synapse, it is reuptake that ends the action.',
      where: 'The gap between the terminal and the neuron below. In the model it is greatly exaggerated.',
    },

    pos: {
      name: 'Postsynaptic neuron',
      morf: 'The neuron that receives the signal. Its membrane, facing the terminal, has the receptors.',
      func: 'Reads serotonin through the receptors. G-protein-coupled receptors open or close channels indirectly and change the metabolism of the cell.',
      where: 'The peach-colored bulb at the bottom, cut open, and the dendrite it comes from.',
    },
    receptor: {
      name: 'Serotonin receptor',
      morf: 'Protein in the postsynaptic membrane. Several serotonin receptors are G-protein-coupled: a single polypeptide that crosses the membrane seven times.',
      func: 'When serotonin binds, the receptor changes shape and activates G-proteins on the inner side of the membrane.',
      clueTitle: 'Why it matters',
      clue: 'The effect depends on the receptor, not only on the transmitter. The same transmitter activates several receptor subtypes.',
      more: [
        'It is a slower pathway than that of an ion channel, but it amplifies the signal and lasts longer.',
        { x: 'There is also a serotonin receptor that is an ion channel, 5-HT3.' },
      ],
      where: 'The blue cylinders in the membrane below. They light up while serotonin is bound.',
    },
    'proteina-g': {
      name: 'G-protein',
      morf: 'Protein with three subunits (α, β and γ), attached to the inner face of the membrane. At rest, α holds a GDP.',
      func: 'Activated by the receptor, it swaps GDP for GTP and splits into two parts, which act on effector proteins: a channel or an enzyme.',
      clueTitle: 'How it switches off',
      clue: 'The α subunit itself breaks GTP down to GDP. That way it switches itself off, and the cycle starts again.',
      more: [
        'Through the shortcut pathway, the G-protein opens a channel directly. Through the cascade, it switches on an enzyme that makes second messengers.',
        'One activated receptor activates 10 to 20 G-proteins: the signal is amplified.',
      ],
      where: 'The three green grains under each receptor, on the inner side.',
    },

    transportador: {
      name: 'Reuptake transporter',
      aka: 'Serotonin transporter',
      morf: 'Protein in the membrane of the terminal, specific for serotonin.',
      func: 'Brings serotonin from the cleft back into the cytosol of the terminal. That is how its action ends.',
      clueTitle: 'Where the energy comes from',
      clue: 'It does not break down ATP. It works by cotransport: two Na⁺ enter together with each transmitter molecule, down the Na⁺ gradient that the pumps created.',
      more: [
        'It can concentrate the transmitter up to 10,000 times.',
        'Transporters are where cocaine, amphetamines and some psychiatric drugs act.',
        { x: 'The technical name of this transporter is SERT.' },
      ],
      where: 'The blue-green proteins at the edge of the floor of the terminal, with the mouth facing the cleft.',
    },
    sodio: {
      name: 'Sodium (Na⁺)',
      rows: [['Outside', '150 mM'], ['Inside', '15 mM']],
      morf: 'Cation ten times more concentrated outside the neuron.',
      func: 'Pays for reuptake: as it enters down its gradient, it carries serotonin along through the transporter.',
      where: 'The orange dots, smaller than serotonin. Two enter with each molecule taken back up.',
    },
    mao: {
      name: 'MAO',
      aka: 'Monoamine oxidase',
      morf: 'Enzyme attached to the outer membrane of the mitochondria.',
      func: 'Destroys the serotonin that returned to the terminal and was not reloaded into a vesicle.',
      more: [{ x: 'There are antidepressants that act here, and not on the transporter: the MAO inhibitors.' }],
      where: 'The red grains on the surface of the mitochondria.',
    },

    isrs: {
      name: 'SSRI',
      aka: 'Selective serotonin reuptake inhibitor',
      rows: [['Example in the book', 'Fluoxetine (Prozac)']],
      morf: 'Drug that binds to the serotonin transporter.',
      func: 'Occupies the transporter and blocks reuptake. The serotonin that is released stays longer in the cleft and activates the receptors for longer.',
      clueTitle: 'In pharmacology terms',
      clue: 'It is an inhibitor: it blocks the function of a protein involved in synaptic transmission. It does not mimic the transmitter (that would be an agonist) and it does not occupy the receptor (that would be an antagonist).',
      more: [
        { x: '"Selective" means that it acts on the serotonin transporter much more than on those of other amines.' },
        { x: 'Other SSRIs: sertraline, escitalopram, paroxetine and citalopram.' },
        { x: 'Imaging studies indicate that, at usual doses, about 80% of the transporters are occupied. In the model, it is 5 of 6.' },
        { x: 'The transporter is blocked within hours, but the improvement in mood usually takes weeks. More serotonin in the cleft is only the first step, and this model shows only that step.' },
      ],
      where: 'The magenta capsules in the mouth of the transporters, with the SSRI switch on. In the model, 5 of the 6 transporters are occupied.',
    },
  },
};
